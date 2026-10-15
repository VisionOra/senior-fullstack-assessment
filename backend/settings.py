import os

from dotenv import load_dotenv

load_dotenv()

PUBLIC_API_URL = os.getenv("PUBLIC_API_URL", "https://dummyjson.com/products?limit=12")
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_TTL_MINUTES = int(os.getenv("ACCESS_TTL_MINUTES", "15"))
REFRESH_TTL_DAYS = int(os.getenv("REFRESH_TTL_DAYS", "30"))
AUTH_RATE_LIMIT = int(os.getenv("AUTH_RATE_LIMIT", "10"))
AUTH_RATE_WINDOW_SECONDS = int(os.getenv("AUTH_RATE_WINDOW_SECONDS", "60"))
