import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import get_db
from models import Movie, User
from schemas import MovieCreate, MovieUpdate, MovieResponse, MovieTitle, MovieDescription
from auth import get_current_user, require_admin

router = APIRouter(prefix="/api/movies", tags=["Movies"])


def _movie_to_response(movie: Movie) -> MovieResponse:
    """Convert a Movie ORM object to MovieResponse schema."""
    return MovieResponse(
        id=movie.id,
        title=MovieTitle(en=movie.title_en, ru=movie.title_ru, uz=movie.title_uz),
        description=MovieDescription(en=movie.description_en, ru=movie.description_ru, uz=movie.description_uz),
        poster=movie.poster,
        backdrop=movie.backdrop,
        videoUrl=movie.video_url,
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
    """Update a movie (admin only)."""
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
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    db.delete(movie)
    db.commit()


@router.post("/{movie_id}/view", response_model=MovieResponse)
def increment_views(movie_id: str, db: Session = Depends(get_db)):
    """Increment the view count of a movie."""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")
    movie.views += 1
    db.commit()
    db.refresh(movie)
    return _movie_to_response(movie)
