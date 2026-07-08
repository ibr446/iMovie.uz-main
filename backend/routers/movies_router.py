import os
import re
import uuid
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import inspect, or_, text

from ..database import engine, get_db
from models import Movie, User
from schemas import MovieCreate, MovieUpdate, MovieResponse, MovieTitle, MovieDescription
from auth import get_current_user, require_admin

router = APIRouter(prefix="/api/movies", tags=["Movies"])

MOVIES_DIR_ABS = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "Movies"))
SUBTITLE_EXTENSIONS = {".srt", ".vtt"}
VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".m4v", ".mkv", ".avi"}


def ensure_movie_episode_columns():
    inspector = inspect(engine)
    if "movies" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("movies")}
    with engine.begin() as connection:
        if "content_type" not in columns:
            connection.execute(text("ALTER TABLE movies ADD COLUMN content_type VARCHAR DEFAULT 'movie'"))
        if "episodes" not in columns:
            connection.execute(text("ALTER TABLE movies ADD COLUMN episodes JSON DEFAULT '[]'"))


def _normalize_local_media_path(video_url: str) -> Optional[str]:
    raw_url = video_url.strip()
    if raw_url.startswith("http://") or raw_url.startswith("https://"):
        return None
    if raw_url.startswith("/media/"):
        return raw_url[len("/media/"):]
    if raw_url.startswith("/"):
        return raw_url[1:]
    return raw_url


def _slugify_name(name: str) -> str:
    return ''.join(ch for ch in name.lower() if ch.isalnum())


def _match_video_to_subtitle(video_base: str, subtitle_name: str) -> bool:
    video_slug = _slugify_name(video_base)
    subtitle_slug = _slugify_name(subtitle_name)
    if not video_slug or not subtitle_slug:
        return False
    if video_slug == subtitle_slug:
        return True
    if video_slug in subtitle_slug or subtitle_slug in video_slug:
        return True
    if video_slug.endswith('s') and video_slug[:-1] == subtitle_slug:
        return True
    if subtitle_slug.endswith('s') and subtitle_slug[:-1] == video_slug:
        return True
    return False


def _lang_from_srt_filename(filename: str) -> Optional[str]:
    normalized = filename.lower()
    if "english" in normalized or ".en." in normalized or normalized.endswith(".en.srt") or "_en" in normalized or "-en" in normalized:
        return "en"
    if "russian" in normalized or "рус" in normalized or ".ru." in normalized or normalized.endswith(".ru.srt") or "_ru" in normalized or "-ru" in normalized:
        return "ru"
    if "uzbek" in normalized or "o'zbek" in normalized or ".uz." in normalized or normalized.endswith(".uz.srt") or "_uz" in normalized or "-uz" in normalized:
        return "uz"
    return None


def _lang_from_filename(filename: str) -> Optional[str]:
    stem = os.path.splitext(filename.lower())[0]
    tokens = [token for token in re.split(r"[^a-z0-9]+", stem) if token]
    if "english" in tokens or "eng" in tokens or "en" in tokens:
        return "en"
    if "russian" in tokens or "rus" in tokens or "ru" in tokens:
        return "ru"
    if "uzbek" in tokens or "uzb" in tokens or "uz" in tokens or "ozbek" in tokens:
        return "uz"
    return None


def _media_url_from_relative_path(path_relative: str) -> str:
    return f"/media/{path_relative.replace(chr(92), '/')}"


def _detect_subtitle_urls(video_url: str) -> dict[str, str]:
    video_path = _normalize_local_media_path(video_url)
    if not video_path:
        return {}

    video_dir = os.path.dirname(video_path)
    video_base = os.path.splitext(os.path.basename(video_path))[0]
    search_dir = os.path.join(MOVIES_DIR_ABS, video_dir) if video_dir else MOVIES_DIR_ABS
    if not os.path.isdir(search_dir):
        return {}

    matched: dict[str, str] = {}
    unmatched_generic: dict[str, str] = {}

    for entry in os.listdir(search_dir):
        if os.path.splitext(entry.lower())[1] not in SUBTITLE_EXTENSIONS:
            continue
        lang = _lang_from_filename(entry) or _lang_from_srt_filename(entry)
        if not lang:
            continue

        entry_base = os.path.splitext(entry)[0]
        path_relative = os.path.join(video_dir, entry) if video_dir else entry
        subtitle_url = _media_url_from_relative_path(path_relative)

        if _match_video_to_subtitle(video_base, entry_base):
            matched[lang] = subtitle_url
        else:
            unmatched_generic.setdefault(lang, subtitle_url)

    if not matched:
        return unmatched_generic

    for lang, url in unmatched_generic.items():
        matched.setdefault(lang, url)

    return matched


def _detect_audio_urls(video_url: str) -> dict[str, str]:
    video_path = _normalize_local_media_path(video_url)
    if not video_path:
        return {"original": video_url.strip()} if video_url.strip() else {}

    video_dir = os.path.dirname(video_path)
    video_base = os.path.splitext(os.path.basename(video_path))[0]
    search_dir = os.path.join(MOVIES_DIR_ABS, video_dir) if video_dir else MOVIES_DIR_ABS
    original_url = _media_url_from_relative_path(video_path)
    if not os.path.isdir(search_dir):
        return {"original": original_url}

    matched: dict[str, str] = {"original": original_url}
    unmatched_generic: dict[str, str] = {}

    for entry in os.listdir(search_dir):
        if os.path.splitext(entry.lower())[1] not in VIDEO_EXTENSIONS:
            continue

        entry_base = os.path.splitext(entry)[0]
        if _slugify_name(entry_base) == _slugify_name(video_base):
            continue

        lang = _lang_from_filename(entry)
        if not lang:
            continue

        path_relative = os.path.join(video_dir, entry) if video_dir else entry
        audio_url = _media_url_from_relative_path(path_relative)

        if _match_video_to_subtitle(video_base, entry_base):
            matched[lang] = audio_url
        else:
            unmatched_generic.setdefault(lang, audio_url)

    for lang, url in unmatched_generic.items():
        matched.setdefault(lang, url)

    return matched


def _normalize_content_type(content_type: str | None) -> str:
    return "series" if content_type == "series" else "movie"


def _normalize_episodes(episodes: list | None) -> list[dict[str, str | int]]:
    if isinstance(episodes, str):
        try:
            episodes = json.loads(episodes)
        except json.JSONDecodeError:
            episodes = []

    normalized = []
    for index, episode in enumerate(episodes or [], start=1):
        number = getattr(episode, "number", None)
        title = getattr(episode, "title", "")
        video_url = getattr(episode, "videoUrl", "")

        if isinstance(episode, dict):
            number = episode.get("number", number)
            title = episode.get("title", title)
            video_url = episode.get("videoUrl", video_url)

        try:
            episode_number = max(1, int(number or index))
        except (TypeError, ValueError):
            episode_number = index

        normalized.append({
            "number": episode_number,
            "title": str(title or ""),
            "videoUrl": str(video_url or ""),
        })

    return sorted(normalized, key=lambda item: int(item["number"]))


def _movie_to_response(movie: Movie) -> MovieResponse:
    """Convert a Movie ORM object to MovieResponse schema."""
    return MovieResponse(
        id=movie.id,
        title=MovieTitle(en=movie.title_en, ru=movie.title_ru, uz=movie.title_uz),
        description=MovieDescription(en=movie.description_en, ru=movie.description_ru, uz=movie.description_uz),
        poster=movie.poster,
        backdrop=movie.backdrop,
        videoUrl=movie.video_url,
        contentType=_normalize_content_type(movie.content_type),
        episodes=_normalize_episodes(movie.episodes),
        audioUrls=_detect_audio_urls(movie.video_url),
        subtitleUrls=_detect_subtitle_urls(movie.video_url),
        year=movie.year,
        genre=movie.genre or [],
        rating=movie.rating,
        duration=movie.duration,
        country=movie.country,
        isTrending=movie.is_trending,
        isNew=movie.is_new,
        views=movie.views,
    )


@router.get("", response_model=list[MovieResponse])
def get_movies(
    search: Optional[str] = Query(None, description="Search by title"),
    genre: Optional[str] = Query(None, description="Filter by genre"),
    sort: Optional[str] = Query(None, description="Sort: rating, views, year, newest"),
    db: Session = Depends(get_db),
):
    """Get all movies with optional search, genre filter, and sorting."""
    ensure_movie_episode_columns()
    query = db.query(Movie)

    # Search by title (all languages)
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                Movie.title_en.ilike(search_term),
                Movie.title_ru.ilike(search_term),
                Movie.title_uz.ilike(search_term),
            )
        )

    # Filter by genre
    if genre and genre != "All":
        # SQLite JSON contains — we check if the genre string appears in the JSON array
        query = query.filter(Movie.genre.contains(genre))

    # Sorting
    if sort == "rating":
        query = query.order_by(Movie.rating.desc())
    elif sort == "views":
        query = query.order_by(Movie.views.desc())
    elif sort == "year":
        query = query.order_by(Movie.year.desc())
    elif sort == "newest":
        query = query.order_by(Movie.created_at.desc())
    else:
        query = query.order_by(Movie.created_at.desc())

    movies = query.all()
    return [_movie_to_response(m) for m in movies]


@router.get("/{movie_id}", response_model=MovieResponse)
def get_movie(movie_id: str, db: Session = Depends(get_db)):
    """Get a single movie by ID."""
    ensure_movie_episode_columns()
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    return _movie_to_response(movie)


@router.post("", response_model=MovieResponse, status_code=status.HTTP_201_CREATED)
def create_movie(
    data: MovieCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new movie (admin only)."""
    ensure_movie_episode_columns()
    movie = Movie(
        id=str(uuid.uuid4().hex[:12]),
        title_en=data.title.en,
        title_ru=data.title.ru,
        title_uz=data.title.uz,
        description_en=data.description.en,
        description_ru=data.description.ru,
        description_uz=data.description.uz,
        poster=data.poster,
        backdrop=data.backdrop,
        video_url=data.videoUrl,
        content_type=_normalize_content_type(data.contentType),
        episodes=_normalize_episodes(data.episodes),
        year=data.year,
        genre=data.genre,
        rating=data.rating,
        duration=data.duration,
        country=data.country,
        is_trending=data.isTrending,
        is_new=data.isNew,
        views=0,
    )
    db.add(movie)
    db.commit()
    db.refresh(movie)
    return _movie_to_response(movie)


@router.put("/{movie_id}", response_model=MovieResponse)
def update_movie(
    movie_id: str,
    data: MovieUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    print("KELGAN DATA", data.dict())
    """Update a movie (admin only)."""
    ensure_movie_episode_columns()
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    if data.title is not None:
        movie.title_en = data.title.en
        movie.title_ru = data.title.ru
        movie.title_uz = data.title.uz
    if data.description is not None:
        movie.description_en = data.description.en
        movie.description_ru = data.description.ru
        movie.description_uz = data.description.uz
    if data.poster is not None:
        movie.poster = data.poster
    if data.backdrop is not None:
        movie.backdrop = data.backdrop
    if data.videoUrl is not None:
        movie.video_url = data.videoUrl
    # Debug log for admin updates
    # try:
    #     print("[ADMIN UPDATE]", movie_id, "contentType=", data.contentType, "episodes=", (len(data.episodes) if data.episodes else None))
    # except Exception:
    #     pass

    if data.contentType is not None:
        movie.content_type = data.contentType
    if data.episodes is not None:
        movie.episodes = _normalize_episodes(data.episodes)
    if data.year is not None:
        movie.year = data.year
    if data.genre is not None:
        movie.genre = data.genre
    if data.rating is not None:
        movie.rating = data.rating
    if data.duration is not None:
        movie.duration = data.duration
    if data.country is not None:
        movie.country = data.country
    if data.isTrending is not None:
        movie.is_trending = data.isTrending
    if data.isNew is not None:
        movie.is_new = data.isNew

    db.commit()
    db.refresh(movie)
    return _movie_to_response(movie)


@router.delete("/{movie_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_movie(
    movie_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a movie (admin only)."""
    ensure_movie_episode_columns()
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    db.delete(movie)
    db.commit()


@router.post("/{movie_id}/view", response_model=MovieResponse)
def increment_views(movie_id: str, db: Session = Depends(get_db)):
    """Increment the view count of a movie."""
    ensure_movie_episode_columns()
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    movie.views += 1
    db.commit()
    db.refresh(movie)
    return _movie_to_response(movie)
