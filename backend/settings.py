import os

from dotenv import load_dotenv

load_dotenv()

PUBLIC_API_URL = os.getenv("PUBLIC_API_URL", "https://dummyjson.com/products?limit=12")
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
JWT_TTL_HOURS = 24
