import json
import os
import re
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from database import get_db
from models import User


def _load_local_env() -> None:
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    for filename in (".env", ".env.local"):
        path = os.path.join(root_dir, filename)
        if not os.path.exists(path):
            continue
        with open(path, "r", encoding="utf-8") as env_file:
            for raw_line in env_file:
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                os.environ.setdefault(key.strip(), value.strip().strip("'\""))


_load_local_env()

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "imovie-uz-super-secret-key-change-in-production-2024")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = {"https://accounts.google.com", "accounts.google.com"}

_google_jwks_cache: dict[str, object] = {"keys": [], "expires_at": 0.0}

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)


def validate_password_strength(password: str) -> None:
    """Require a password that resists simple guessing attacks."""
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )

    checks = [
        (r"[a-z]", "a lowercase letter"),
        (r"[A-Z]", "an uppercase letter"),
        (r"\d", "a number"),
        (r"[^A-Za-z0-9]", "a special character"),
    ]
    missing = [label for pattern, label in checks if not re.search(pattern, password)]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password must include {', '.join(missing)}",
        )


def hash_password(password: str) -> str:
    """Hash a plain-text password using bcrypt directly."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against its bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode = data.copy()
    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def _fetch_google_jwks() -> list[dict]:
    now = time.time()
    if now < float(_google_jwks_cache["expires_at"]):
        return _google_jwks_cache["keys"]  # type: ignore[return-value]

    with urllib.request.urlopen(GOOGLE_JWKS_URL, timeout=8) as response:
        payload = json.loads(response.read().decode("utf-8"))
        cache_control = response.headers.get("Cache-Control", "")

    max_age = 3600
    match = re.search(r"max-age=(\d+)", cache_control)
    if match:
        max_age = int(match.group(1))

    keys = payload.get("keys", [])
    _google_jwks_cache["keys"] = keys
    _google_jwks_cache["expires_at"] = now + max_age
    return keys


def verify_google_id_token(credential: str) -> dict:
    """Verify a Google Identity Services ID token and return its claims."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google login is not configured",
        )

    try:
        header = jwt.get_unverified_header(credential)
        key = next((item for item in _fetch_google_jwks() if item.get("kid") == header.get("kid")), None)
        if key is None:
            raise JWTError("Google signing key not found")

        payload = jwt.decode(
            credential,
            key,
            algorithms=["RS256"],
            audience=GOOGLE_CLIENT_ID,
            options={"verify_at_hash": False},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google credential",
        ) from exc

    if payload.get("iss") not in GOOGLE_ISSUERS:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google issuer")
    if not payload.get("email") or not payload.get("email_verified"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google email is not verified")

    return payload


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Decode the JWT token and return the current user.
    Returns None if no token provided for optional auth endpoints.
    """
    if token is None:
        return None

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except JWTError:
        return None

    user = db.query(User).filter(User.id == user_id).first()
    return user


async def require_auth(
    user: Optional[User] = Depends(get_current_user),
) -> User:
    """Dependency that requires authentication. Raises 401 if not logged in."""
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def require_admin(
    user: User = Depends(require_auth),
) -> User:
    """Dependency that requires admin role. Raises 403 if not admin."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
