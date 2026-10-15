from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from settings import JWT_ALGORITHM, JWT_SECRET, JWT_TTL_HOURS

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer = HTTPBearer(auto_error=False)


def api_error(status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status, {"code": code, "message": message})


def hash_password(password: str) -> str:
    return pwd.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd.verify(password, hashed)


def create_token(user_id: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(hours=JWT_TTL_HOURS)
    return jwt.encode({"sub": str(user_id), "exp": exp}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def current_user_id(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> int:
    if creds is None:
        raise api_error(401, "unauthorized", "Missing bearer token")
    try:
        return int(jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])["sub"])
    except (JWTError, KeyError, ValueError):
        raise api_error(401, "unauthorized", "Invalid or expired token")
