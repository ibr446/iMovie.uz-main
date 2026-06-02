from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import User, Movie, SavedMovie, WatchHistory
from schemas import MovieResponse, MovieTitle, MovieDescription, StatsResponse, UserResponse
from auth import require_auth, require_admin

router = APIRouter(prefix="/api/users", tags=["Users"])


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


# ── Saved Movies ──────────────────────────────────────────────────

@router.get("/saved", response_model=list[MovieResponse])
def get_saved_movies(user: User = Depends(require_auth), db: Session = Depends(get_db)):
    """Get the current user's saved movies list."""
    saved = (
        db.query(Movie)
        .join(SavedMovie, SavedMovie.movie_id == Movie.id)
        .filter(SavedMovie.user_id == user.id)
        .order_by(SavedMovie.saved_at.desc())
        .all()
    )
    return [_movie_to_response(m) for m in saved]


@router.post("/saved/{movie_id}")
def toggle_save_movie(movie_id: str, user: User = Depends(require_auth), db: Session = Depends(get_db)):
    """Toggle save/unsave a movie. Returns current saved status."""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    existing = db.query(SavedMovie).filter(
        SavedMovie.user_id == user.id,
        SavedMovie.movie_id == movie_id,
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        return {"saved": False, "message": "Movie removed from list"}
    else:
        saved = SavedMovie(user_id=user.id, movie_id=movie_id)
        db.add(saved)
        db.commit()
        return {"saved": True, "message": "Movie saved"}


@router.delete("/saved/{movie_id}", status_code=status.HTTP_204_NO_CONTENT)
def unsave_movie(movie_id: str, user: User = Depends(require_auth), db: Session = Depends(get_db)):
    """Remove a movie from the user's saved list."""
    saved = db.query(SavedMovie).filter(
        SavedMovie.user_id == user.id,
        SavedMovie.movie_id == movie_id,
    ).first()
    if not saved:
        raise HTTPException(status_code=404, detail="Movie not in saved list")
    db.delete(saved)
    db.commit()


# ── Watch History ─────────────────────────────────────────────────

@router.get("/history", response_model=list[MovieResponse])
def get_watch_history(user: User = Depends(require_auth), db: Session = Depends(get_db)):
    """Get the current user's watch history."""
    history = (
        db.query(Movie)
        .join(WatchHistory, WatchHistory.movie_id == Movie.id)
        .filter(WatchHistory.user_id == user.id)
        .order_by(WatchHistory.watched_at.desc())
        .all()
    )
    return [_movie_to_response(m) for m in history]


@router.post("/history/{movie_id}", status_code=status.HTTP_201_CREATED)
def add_to_history(movie_id: str, user: User = Depends(require_auth), db: Session = Depends(get_db)):
    """Add a movie to the user's watch history."""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    entry = WatchHistory(
        user_id=user.id,
        movie_id=movie_id,
        watched_at=datetime.now(timezone.utc),
    )
    db.add(entry)
    db.commit()
    return {"message": "Added to watch history"}


# ── Admin Stats ───────────────────────────────────────────────────

@router.get("/stats", response_model=StatsResponse)
def get_stats(admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get platform statistics (admin only)."""
    total_movies = db.query(func.count(Movie.id)).scalar() or 0
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_views = db.query(func.sum(Movie.views)).scalar() or 0
    avg_rating = db.query(func.avg(Movie.rating)).scalar() or 0.0

    return StatsResponse(
        totalMovies=total_movies,
        totalUsers=total_users,
        totalViews=total_views,
        avgRating=round(float(avg_rating), 1),
    )
