import os
import sys
from pathlib import Path

import psycopg
from dotenv import load_dotenv

MIGRATIONS = Path(__file__).parent / "migrations"


def migrate(database_url: str) -> list[str]:
    applied = []
    with psycopg.connect(database_url) as conn:
        conn.execute(
            "CREATE TABLE IF NOT EXISTS schema_migrations ("
            " version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
        )
        conn.commit()
        done = {row[0] for row in conn.execute("SELECT version FROM schema_migrations")}
        for path in sorted(MIGRATIONS.glob("*.sql")):
            if path.stem in done:
                continue
            with conn.transaction():
                conn.execute(path.read_text())
                conn.execute("INSERT INTO schema_migrations (version) VALUES (%s)", (path.stem,))
            applied.append(path.stem)
    return applied


if __name__ == "__main__":
    load_dotenv()
    names = migrate(os.environ["DATABASE_URL"])
    print("applied: " + ", ".join(names) if names else "up to date")
    sys.exit(0)
