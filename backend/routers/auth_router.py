import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import get_db
from models import User, SavedMovie, WatchHistory
from schemas import UserRegister, UserLogin, UserResponse, Token
from auth import hash_password, verify_password, create_access_token, require_auth

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


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
def register(data: UserRegister, db: Session = Depends(get_db)):
    """Register a new user account."""
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        id=f"user-{uuid.uuid4().hex[:12]}",
        name=data.name,
        email=data.email,
        hashed_password=hash_password(data.password),
        avatar=f"https://picsum.photos/seed/{data.email}/100/100",
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
def login(data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate with JSON body and return a JWT token."""
    user = db.query(User).filter(User.email == data.email).first()
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


@router.post("/token")
def login_swagger(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """OAuth2 compatible login for Swagger UI (form data)."""
    user = db.query(User).filter(User.email == form_data.username).first()
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
