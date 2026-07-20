import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import Comment, Movie, User
from schemas import CommentCreate, CommentUpdate, CommentResponse, AdminCommentResponse
from auth import require_auth, get_current_user, require_admin

router = APIRouter(prefix="/api/movies", tags=["Comments"])


def _comment_to_response(comment: Comment) -> CommentResponse:
    """Convert a Comment ORM object to CommentResponse schema."""
    return CommentResponse(
        id=comment.id,
        movieId=comment.movie_id,
        userId=comment.user_id,
        userName=comment.user.name if comment.user else "Unknown",
        userAvatar=comment.user.avatar if comment.user else "",
        text=comment.text,
        date=comment.created_at.strftime("%Y-%m-%d %H:%M") if comment.created_at else "",
        rating=comment.rating,
        parentId=comment.parent_id,
        isEdited=comment.is_edited or False,
        replies=[_comment_to_response(r) for r in (comment.replies or [])],
    )


@router.get("/{movie_id}/comments", response_model=list[CommentResponse])
def get_comments(movie_id: str, db: Session = Depends(get_db)):
    """Get all top-level comments for a movie (with nested replies)."""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    # Only fetch top-level comments (no parent)
    comments = (
        db.query(Comment)
        .filter(Comment.movie_id == movie_id, Comment.parent_id.is_(None))
        .order_by(Comment.created_at.desc())
        .all()
    )
    return [_comment_to_response(c) for c in comments]


@router.post("/{movie_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(
    movie_id: str,
    data: CommentCreate,
    user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """Add a comment or reply to a movie (auth required)."""
    movie = db.query(Movie).filter(Movie.id == movie_id).first()
    if not movie:
        raise HTTPException(status_code=404, detail="Movie not found")

    # If replying, verify parent exists
    if data.parentId:
        parent = db.query(Comment).filter(Comment.id == data.parentId).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent comment not found")

    comment = Comment(
        id=f"comment-{uuid.uuid4().hex[:12]}",
        movie_id=movie_id,
        user_id=user.id,
        text=data.text,
        rating=data.rating,
        parent_id=data.parentId,
        created_at=datetime.now(timezone.utc),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return _comment_to_response(comment)


@router.put("/{movie_id}/comments/{comment_id}", response_model=CommentResponse)
def update_comment(
    movie_id: str,
    comment_id: str,
    data: CommentUpdate,
    user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """Edit a comment (owner only)."""
    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.movie_id == movie_id,
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.user_id != user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own comments")

    comment.text = data.text
    comment.is_edited = True
    db.commit()
    db.refresh(comment)
    return _comment_to_response(comment)


@router.delete("/{movie_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    movie_id: str,
    comment_id: str,
    user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """Delete a comment (owner or admin only)."""
    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.movie_id == movie_id,
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    # Only the comment author or admin can delete
    if comment.user_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    db.delete(comment)
    db.commit()


# ── Admin Endpoints ───────────────────────────────────────────────

@router.get("/comments/all", response_model=list[AdminCommentResponse])
def get_all_comments_admin(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Get all comments across all movies (admin only)."""
    comments = (
        db.query(Comment)
        .order_by(Comment.created_at.desc())
        .limit(200)
        .all()
    )
    result = []
    for c in comments:
        movie_title = ""
        if c.movie:
            movie_title = c.movie.title_en or c.movie.title_uz or ""
        result.append(
            AdminCommentResponse(
                id=c.id,
                movieId=c.movie_id,
                movieTitle=movie_title,
                userId=c.user_id,
                userName=c.user.name if c.user else "Unknown",
                userAvatar=c.user.avatar if c.user else "",
                text=c.text[:200] + ("..." if len(c.text) > 200 else ""),
                date=c.created_at.strftime("%Y-%m-%d %H:%M") if c.created_at else "",
                rating=c.rating or 0.0,
            )
        )
    return result


@router.delete("/comments/all/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_comment(
    comment_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete any comment (admin only)."""
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    db.delete(comment)
    db.commit()
