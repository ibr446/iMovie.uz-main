import json
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, JSON, UniqueConstraint
)
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    avatar = Column(String, default="")
    role = Column(String, default="user")  # 'user' | 'admin'
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    comments = relationship("Comment", back_populates="user", cascade="all, delete-orphan")
    saved_movies = relationship("SavedMovie", back_populates="user", cascade="all, delete-orphan")
    watch_history = relationship("WatchHistory", back_populates="user", cascade="all, delete-orphan")
    short_comments = relationship("ShortComment", back_populates="user", cascade="all, delete-orphan")
    short_likes = relationship("ShortLike", back_populates="user", cascade="all, delete-orphan")
    short_saves = relationship("ShortSave", back_populates="user", cascade="all, delete-orphan")


class Movie(Base):
    __tablename__ = "movies"

    id = Column(String, primary_key=True, index=True)
    title_en = Column(String, nullable=False)
    title_ru = Column(String, nullable=False)
    title_uz = Column(String, nullable=False)
    description_en = Column(Text, default="")
    description_ru = Column(Text, default="")
    description_uz = Column(Text, default="")
    poster = Column(String, default="")
    backdrop = Column(String, default="")
    video_url = Column(String, default="")
    year = Column(Integer, default=2024)
    genre = Column(JSON, default=list)  # stored as JSON array
    rating = Column(Float, default=0.0)
    duration = Column(String, default="")
    country = Column(String, default="")
    is_trending = Column(Boolean, default=False)
    is_new = Column(Boolean, default=False)
    views = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    comments = relationship("Comment", back_populates="movie", cascade="all, delete-orphan")
    saved_by = relationship("SavedMovie", back_populates="movie", cascade="all, delete-orphan")
    watched_by = relationship("WatchHistory", back_populates="movie", cascade="all, delete-orphan")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(String, primary_key=True, index=True)
    movie_id = Column(String, ForeignKey("movies.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    rating = Column(Float, default=5.0)
    parent_id = Column(String, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)
    is_edited = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    movie = relationship("Movie", back_populates="comments")
    user = relationship("User", back_populates="comments")
    replies = relationship("Comment", backref="parent", remote_side=[id], cascade="all, delete-orphan",
                           single_parent=True, lazy="joined")


class SavedMovie(Base):
    __tablename__ = "saved_movies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    movie_id = Column(String, ForeignKey("movies.id", ondelete="CASCADE"), nullable=False)
    saved_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="saved_movies")
    movie = relationship("Movie", back_populates="saved_by")


class WatchHistory(Base):
    __tablename__ = "watch_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    movie_id = Column(String, ForeignKey("movies.id", ondelete="CASCADE"), nullable=False)
    watched_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="watch_history")
    movie = relationship("Movie", back_populates="watched_by")


class ShortVideo(Base):
    __tablename__ = "short_videos"

    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    author = Column(String, default="@imovie_official")
    name = Column(String, default="iMovie.uz")
    avatar = Column(String, default="")
    video_url = Column(String, nullable=False)
    caption = Column(Text, default="")
    audio = Column(String, default="")
    location = Column(String, default="")
    tags = Column(JSON, default=list)
    likes = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    views = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    comments = relationship("ShortComment", back_populates="short", cascade="all, delete-orphan")
    liked_by = relationship("ShortLike", back_populates="short", cascade="all, delete-orphan")
    saved_by = relationship("ShortSave", back_populates="short", cascade="all, delete-orphan")


class ShortComment(Base):
    __tablename__ = "short_comments"

    id = Column(String, primary_key=True, index=True)
    short_id = Column(String, ForeignKey("short_videos.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    short = relationship("ShortVideo", back_populates="comments")
    user = relationship("User", back_populates="short_comments")


class ShortLike(Base):
    __tablename__ = "short_likes"
    __table_args__ = (UniqueConstraint("user_id", "short_id", name="uq_short_like_user_video"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    short_id = Column(String, ForeignKey("short_videos.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="short_likes")
    short = relationship("ShortVideo", back_populates="liked_by")


class ShortSave(Base):
    __tablename__ = "short_saves"
    __table_args__ = (UniqueConstraint("user_id", "short_id", name="uq_short_save_user_video"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    short_id = Column(String, ForeignKey("short_videos.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="short_saves")
    short = relationship("ShortVideo", back_populates="saved_by")
