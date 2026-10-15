import hashlib
import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from settings import (
    ACCESS_TTL_MINUTES,
    AUTH_RATE_LIMIT,
    AUTH_RATE_WINDOW_SECONDS,
    JWT_ALGORITHM,
    JWT_SECRET,
    REFRESH_TTL_DAYS,
)

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)


def api_error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message})


def hash_password(password: str) -> str:
    return pwd.hash(password)


DUMMY_HASH = pwd.hash("timing-equalizer")


def verify_password(password: str, hashed: str | None) -> bool:
    if hashed is None:
        pwd.verify(password, DUMMY_HASH)
        return False
    return pwd.verify(password, hashed)


def create_access_token(user_id: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TTL_MINUTES)
    return jwt.encode({"sub": str(user_id), "type": "access", "exp": exp}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def new_refresh_token() -> tuple[str, str, datetime]:
    raw = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TTL_DAYS)
    return raw, hash_refresh_token(raw), expires_at


def hash_refresh_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def current_user_id(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> int:
    if creds is None:
        raise api_error(401, "unauthorized", "Missing bearer token")
    try:
        claims = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if claims.get("type") != "access":
            raise JWTError("wrong token type")
        return int(claims["sub"])
    except (JWTError, KeyError, ValueError):
        raise api_error(401, "unauthorized", "Invalid or expired token")


class RateLimiter:
    def __init__(self, limit: int, window_seconds: int):
        self.limit = limit
        self.window = window_seconds
        self.hits: dict[str, deque[float]] = defaultdict(deque)
        self.lock = threading.Lock()

    def check(self, key: str) -> None:
        now = time.monotonic()
        with self.lock:
            hits = self.hits[key]
            while hits and hits[0] <= now - self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                retry = int(hits[0] + self.window - now) + 1
                raise HTTPException(
                    429,
                    {"code": "rate_limited", "message": f"Too many attempts. Try again in {retry}s."},
                    headers={"Retry-After": str(retry)},
                )
            hits.append(now)

    def reset(self) -> None:
        with self.lock:
            self.hits.clear()


auth_limiter = RateLimiter(AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_SECONDS)


def limit_auth(request: Request) -> None:
    client = request.client.host if request.client else "unknown"
    auth_limiter.check(f"{client}:{request.url.path}")
