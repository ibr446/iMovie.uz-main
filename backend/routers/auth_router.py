import uuid
from collections import defaultdict, deque
from time import monotonic

from email_validator import EmailNotValidError, validate_email
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import User, SavedMovie, WatchHistory
from schemas import GoogleLogin, UserRegister, UserLogin, UserResponse, Token
from auth import (
    create_access_token,
    hash_password,
    require_auth,
    require_admin,
    validate_password_strength,
    verify_google_id_token,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
_rate_limit_buckets: dict[str, deque[float]] = defaultdict(deque)
DISPOSABLE_EMAIL_DOMAINS = {
    "10minutemail.com",
    "guerrillamail.com",
    "mailinator.com",
    "tempmail.com",
    "temp-mail.org",
    "yopmail.com",
}


def _client_identifier(request: Request, email: str, action: str) -> str:
    host = request.client.host if request.client else "unknown"
    return f"{action}:{host}:{email.strip().lower()}"


def _rate_limit(key: str, limit: int, window_seconds: int) -> None:
    now = monotonic()
    bucket = _rate_limit_buckets[key]
    while bucket and now - bucket[0] > window_seconds:
        bucket.popleft()
    if len(bucket) >= limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many attempts. Please try again later.",
        )
    bucket.append(now)


def _normalize_email(email: str, check_deliverability: bool = False) -> str:
    try:
        validated = validate_email(
            email,
            check_deliverability=check_deliverability,
            allow_smtputf8=False,
        )
    except EmailNotValidError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Please enter a real email address. {exc}",
        ) from exc

    normalized = validated.normalized.lower()
    domain = normalized.rsplit("@", 1)[-1]
    if domain in DISPOSABLE_EMAIL_DOMAINS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Temporary email addresses are not allowed.",
        )
    return normalized


def _find_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(func.lower(User.email) == email.lower()).first()


def _build_user_response(user: User, db: Session) -> UserResponse:
    """Build UserResponse with saved movies and watch history."""
    saved = db.query(SavedMovie.movie_id).filter(SavedMovie.user_id == user.id).all()
    history = db.query(WatchHistory.movie_id).filter(WatchHistory.user_id == user.id).all()
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        avatar=user.avatar,
        role=user.role,
        savedMovies=[s[0] for s in saved],
        watchHistory=[h[0] for h in history],
    )


@router.post("/register", response_model=Token)
def register(data: UserRegister, request: Request, db: Session = Depends(get_db)):
    """Register a new user account."""
    email = _normalize_email(str(data.email), check_deliverability=True)
    _rate_limit(_client_identifier(request, email, "register"), limit=3, window_seconds=300)
    validate_password_strength(data.password)

    name = data.name.strip()
    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters")

    existing = _find_user_by_email(db, email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        id=f"user-{uuid.uuid4().hex[:12]}",
        name=name,
        email=email,
        hashed_password=hash_password(data.password),
        avatar=f"https://picsum.photos/seed/{email}/100/100",
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    return Token(
        access_token=token,
        user=_build_user_response(user, db),
    )


@router.post("/login", response_model=Token)
def login(data: UserLogin, request: Request, db: Session = Depends(get_db)):
    """Authenticate with JSON body and return a JWT token."""
    email = _normalize_email(str(data.email), check_deliverability=False)
    _rate_limit(_client_identifier(request, email, "login"), limit=6, window_seconds=300)

    user = _find_user_by_email(db, email)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token({"sub": user.id})
    return Token(
        access_token=token,
        user=_build_user_response(user, db),
    )


@router.post("/google", response_model=Token)
def google_login(data: GoogleLogin, request: Request, db: Session = Depends(get_db)):
    """Authenticate or create a user from a verified Google ID token."""
    _rate_limit(_client_identifier(request, "google", "google"), limit=10, window_seconds=300)
    claims = verify_google_id_token(data.credential)

    email = _normalize_email(claims["email"], check_deliverability=False)
    name = (claims.get("name") or email.split("@", 1)[0]).strip()[:80]
    avatar = (claims.get("picture") or "").strip()

    user = _find_user_by_email(db, email)
    if user is None:
        user = User(
            id=f"user-{uuid.uuid4().hex[:12]}",
            name=name or "Google User",
            email=email,
            hashed_password=hash_password(uuid.uuid4().hex + "!Aa1"),
            avatar=avatar or f"https://picsum.photos/seed/{email}/100/100",
            role="user",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif avatar and not user.avatar:
        user.avatar = avatar
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": user.id})
    return Token(
        access_token=token,
        user=_build_user_response(user, db),
    )


@router.post("/token")
def login_swagger(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """OAuth2 compatible login for Swagger UI (form data)."""
    email = _normalize_email(form_data.username, check_deliverability=False)
    user = _find_user_by_email(db, email)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    token = create_access_token({"sub": user.id})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(require_auth), db: Session = Depends(get_db)):
    """Get the current authenticated user's profile."""
    return _build_user_response(user, db)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a user (admin only). Cannot delete other admins."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Cannot delete admin users")
    db.delete(user)
    db.commit()

