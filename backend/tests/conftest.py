import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv
from psycopg.conninfo import conninfo_to_dict, make_conninfo

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from migrate import migrate  # noqa: E402


def _test_database_url() -> str:
    explicit = os.getenv("TEST_DATABASE_URL")
    if explicit:
        return explicit
    params = conninfo_to_dict(os.environ["DATABASE_URL"])
    params["dbname"] = f"{params.get('dbname', 'assessment')}_test"
    return make_conninfo(**params)


def _ensure_database(url: str) -> None:
    params = conninfo_to_dict(url)
    name = params["dbname"]
    admin = make_conninfo(**{**params, "dbname": "postgres"})
    with psycopg.connect(admin, autocommit=True) as conn:
        if not conn.execute("SELECT 1 FROM pg_database WHERE datname = %s", (name,)).fetchone():
            conn.execute(f'CREATE DATABASE "{name}"')


TEST_DATABASE_URL = _test_database_url()
_ensure_database(TEST_DATABASE_URL)
migrate(TEST_DATABASE_URL)
with psycopg.connect(TEST_DATABASE_URL) as _conn:
    _conn.execute("TRUNCATE selections, refresh_tokens, skus, users RESTART IDENTITY CASCADE")

os.environ["DATABASE_URL"] = TEST_DATABASE_URL
