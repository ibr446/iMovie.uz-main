from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


# ── Auth ──────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GoogleLogin(BaseModel):
    credential: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None


class PasswordUpdate(BaseModel):
    currentPassword: str
    newPassword: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    avatar: str
    role: str
    watchHistory: list[str] = []
    savedMovies: list[str] = []

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Movie ─────────────────────────────────────────────────────────

class MovieTitle(BaseModel):
    en: str = ""
    ru: str = ""
    uz: str = ""


class MovieDescription(BaseModel):
    en: str = ""
    ru: str = ""
    uz: str = ""


class SubtitleUrls(BaseModel):
    en: Optional[str] = None
    ru: Optional[str] = None
    uz: Optional[str] = None


class AudioUrls(BaseModel):
    original: Optional[str] = None
    en: Optional[str] = None
    ru: Optional[str] = None
    uz: Optional[str] = None


class MovieEpisode(BaseModel):
    number: int
    title: str = ""
    videoUrl: str = ""


class MovieCreate(BaseModel):
    title: MovieTitle
    description: MovieDescription
    poster: str = ""
    backdrop: str = ""
    videoUrl: str = ""
    contentType: str = "movie"
    episodes: list[MovieEpisode] = []
    year: int = 2024
    genre: list[str] = []
    rating: float = 0.0
    duration: str = ""
    country: str = ""
    isTrending: bool = False
    isNew: bool = False


class MovieUpdate(BaseModel):
    title: Optional[MovieTitle] = None
    description: Optional[MovieDescription] = None
    poster: Optional[str] = None
    backdrop: Optional[str] = None
    videoUrl: Optional[str] = None
    contentType: Optional[str] = None
    episodes: Optional[list[MovieEpisode]] = None
    subtitleUrls: Optional[SubtitleUrls] = None
    year: Optional[int] = None
    genre: Optional[list[str]] = None
    rating: Optional[float] = None
    duration: Optional[str] = None
    country: Optional[str] = None
    isTrending: Optional[bool] = None
    isNew: Optional[bool] = None


class MovieResponse(BaseModel):
    id: str
    title: MovieTitle
    description: MovieDescription
    poster: str
    backdrop: str
    videoUrl: str
    contentType: str = "movie"
    episodes: list[MovieEpisode] = []
    audioUrls: AudioUrls = AudioUrls()
    subtitleUrls: SubtitleUrls = SubtitleUrls()
    year: int
    genre: list[str]
    rating: float
    duration: str
    country: str
    isTrending: bool
    isNew: bool
    views: int

    class Config:
        from_attributes = True


# ── Comment ───────────────────────────────────────────────────────

class CommentCreate(BaseModel):
    text: str
    rating: float = 5.0
    parentId: Optional[str] = None  # For replies


class CommentUpdate(BaseModel):
    text: str


class CommentResponse(BaseModel):
    id: str
    movieId: str
    userId: str
    userName: str
    userAvatar: str
    text: str
    date: str
    rating: float
    parentId: Optional[str] = None
    isEdited: bool = False
    replies: list["CommentResponse"] = []

    class Config:
        from_attributes = True


# ── Stats ─────────────────────────────────────────────────────────

class StatsResponse(BaseModel):
    totalMovies: int
    totalUsers: int
    totalViews: int
    avgRating: float


# Shorts

class ShortVideoCreate(BaseModel):
    movieId: Optional[str] = None
    author: str = "@imovie_official"
    name: str = "iMovie.uz"
    avatar: str = ""
    videoUrl: str
    caption: str = ""
    audio: str = ""
    location: str = ""
    tags: list[str] = []


class ShortVideoUpdate(BaseModel):
    movieId: Optional[str] = None
    author: Optional[str] = None
    name: Optional[str] = None
    avatar: Optional[str] = None
    videoUrl: Optional[str] = None
    caption: Optional[str] = None
    audio: Optional[str] = None
    location: Optional[str] = None
    tags: Optional[list[str]] = None


class ShortVideoResponse(BaseModel):
    id: str
    movieId: Optional[str] = None
    author: str
    name: str
    avatar: str
    likes: int
    comments: int
    shares: int
    views: int
    videoUrl: str
    caption: str
    audio: str
    location: str
    tags: list[str]
    isLiked: bool = False
    isSaved: bool = False

    class Config:
        from_attributes = True


class ShortCommentCreate(BaseModel):
    text: str


class ShortCommentResponse(BaseModel):
    id: str
    shortId: str
    userId: str
    user: str
    avatar: str
    text: str
    date: str

    class Config:
        from_attributes = True


# ── Admin ─────────────────────────────────────────────────────────

class AdminUserResponse(BaseModel):
    id: str
    name: str
    email: str
    avatar: str
    role: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class AdminCommentResponse(BaseModel):
    id: str
    movieId: str
    movieTitle: str = ""
    userId: str
    userName: str
    userAvatar: str
    text: str
    date: str
    rating: float = 0.0

    class Config:
        from_attributes = True
