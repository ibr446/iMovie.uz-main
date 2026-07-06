import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_current_user, require_admin, require_auth
from database import get_db
from models import ShortComment, ShortLike, ShortSave, ShortVideo, User
from schemas import (
    ShortCommentCreate,
    ShortCommentResponse,
    ShortVideoCreate,
    ShortVideoResponse,
    ShortVideoUpdate,
)

router = APIRouter(prefix="/api/shorts", tags=["Shorts"])


def _comment_count(db: Session, short_id: str) -> int:
    return db.query(func.count(ShortComment.id)).filter(ShortComment.short_id == short_id).scalar() or 0


def _like_count(db: Session, short_id: str) -> int:
    return db.query(func.count(ShortLike.id)).filter(ShortLike.short_id == short_id).scalar() or 0


def _short_to_response(db: Session, short: ShortVideo, user: User | None = None) -> ShortVideoResponse:
    is_liked = False
    is_saved = False

    if user:
        is_liked = db.query(ShortLike).filter(
            ShortLike.user_id == user.id,
            ShortLike.short_id == short.id,
        ).first() is not None
        is_saved = db.query(ShortSave).filter(
            ShortSave.user_id == user.id,
            ShortSave.short_id == short.id,
        ).first() is not None

    return ShortVideoResponse(
        id=short.id,
        movieId=short.movie_id,
        author=short.author,
        name=short.name,
        avatar=short.avatar,
        likes=_like_count(db, short.id),
        comments=_comment_count(db, short.id),
        shares=short.shares,
        views=short.views,
        videoUrl=short.video_url,
        caption=short.caption,
        audio=short.audio,
        location=short.location,
        tags=short.tags or [],
        isLiked=is_liked,
        isSaved=is_saved,
    )


def _comment_to_response(comment: ShortComment) -> ShortCommentResponse:
    return ShortCommentResponse(
        id=comment.id,
        shortId=comment.short_id,
        userId=comment.user_id,
        user=comment.user.name if comment.user else "Unknown",
        avatar=comment.user.avatar if comment.user else "",
        text=comment.text,
        date=comment.created_at.strftime("%Y-%m-%d %H:%M") if comment.created_at else "",
    )


def _get_short_or_404(db: Session, short_id: str) -> ShortVideo:
    short = db.query(ShortVideo).filter(ShortVideo.id == short_id).first()
    if not short:
        raise HTTPException(status_code=404, detail="Short not found")
    return short


@router.get("", response_model=list[ShortVideoResponse])
def get_shorts(
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    shorts = db.query(ShortVideo).order_by(ShortVideo.id.asc()).all()
    return [_short_to_response(db, short, user) for short in shorts]


@router.post("", response_model=ShortVideoResponse, status_code=status.HTTP_201_CREATED)
def create_short(
    data: ShortVideoCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    short = ShortVideo(
        id=f"short-{uuid.uuid4().hex[:12]}",
        user_id=admin.id,
        movie_id=data.movieId,
        author=data.author,
        name=data.name,
        avatar=data.avatar,
        video_url=data.videoUrl,
        caption=data.caption,
        audio=data.audio,
        location=data.location,
        tags=data.tags,
        created_at=datetime.now(timezone.utc),
    )
    db.add(short)
    db.commit()
    db.refresh(short)
    return _short_to_response(db, short, admin)


@router.put("/{short_id}", response_model=ShortVideoResponse)
def update_short(
    short_id: str,
    data: ShortVideoUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    short = _get_short_or_404(db, short_id)

    if data.movieId is not None:
        short.movie_id = data.movieId
    if data.author is not None:
        short.author = data.author
    if data.name is not None:
        short.name = data.name
    if data.avatar is not None:
        short.avatar = data.avatar
    if data.videoUrl is not None:
        short.video_url = data.videoUrl
    if data.caption is not None:
        short.caption = data.caption
    if data.audio is not None:
        short.audio = data.audio
    if data.location is not None:
        short.location = data.location
    if data.tags is not None:
        short.tags = data.tags

    db.commit()
    db.refresh(short)
    return _short_to_response(db, short, admin)


@router.delete("/{short_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_short(
    short_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    short = _get_short_or_404(db, short_id)
    db.delete(short)
    db.commit()


@router.post("/{short_id}/view", response_model=ShortVideoResponse)
def increment_view(
    short_id: str,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    short = _get_short_or_404(db, short_id)
    short.views += 1
    db.commit()
    db.refresh(short)
    return _short_to_response(db, short, user)


@router.post("/{short_id}/like", response_model=ShortVideoResponse)
def toggle_like(
    short_id: str,
    user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    short = _get_short_or_404(db, short_id)
    existing = db.query(ShortLike).filter(
        ShortLike.user_id == user.id,
        ShortLike.short_id == short_id,
    ).first()

    if existing:
        db.delete(existing)
    else:
        db.add(ShortLike(user_id=user.id, short_id=short_id))

    db.flush()
    short.likes = _like_count(db, short_id)

    db.commit()
    db.refresh(short)
    return _short_to_response(db, short, user)


@router.post("/{short_id}/save", response_model=ShortVideoResponse)
def toggle_save(
    short_id: str,
    user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    short = _get_short_or_404(db, short_id)
    existing = db.query(ShortSave).filter(
        ShortSave.user_id == user.id,
        ShortSave.short_id == short_id,
    ).first()

    if existing:
        db.delete(existing)
    else:
        db.add(ShortSave(user_id=user.id, short_id=short_id))

    db.commit()
    db.refresh(short)
    return _short_to_response(db, short, user)


@router.post("/{short_id}/share", response_model=ShortVideoResponse)
def share_short(
    short_id: str,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user),
):
    short = _get_short_or_404(db, short_id)
    short.shares += 1
    db.commit()
    db.refresh(short)
    return _short_to_response(db, short, user)


@router.get("/{short_id}/comments", response_model=list[ShortCommentResponse])
def get_comments(short_id: str, db: Session = Depends(get_db)):
    _get_short_or_404(db, short_id)
    comments = (
        db.query(ShortComment)
        .filter(ShortComment.short_id == short_id)
        .order_by(ShortComment.created_at.desc())
        .all()
    )
    return [_comment_to_response(comment) for comment in comments]


@router.post("/{short_id}/comments", response_model=ShortCommentResponse, status_code=status.HTTP_201_CREATED)
def add_comment(
    short_id: str,
    data: ShortCommentCreate,
    user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    _get_short_or_404(db, short_id)
    comment = ShortComment(
        id=f"short-comment-{uuid.uuid4().hex[:12]}",
        short_id=short_id,
        user_id=user.id,
        text=data.text,
        created_at=datetime.now(timezone.utc),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return _comment_to_response(comment)
