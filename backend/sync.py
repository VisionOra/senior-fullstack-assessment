import httpx

from db import close_pool, get_conn, open_pool
from settings import PUBLIC_API_URL

DEFAULT_QUANTITY = 2


def sync_products() -> int:
    products = httpx.get(PUBLIC_API_URL, timeout=15).raise_for_status().json()["products"]
    rows = [
        (
            p["id"],
            p["title"],
            p.get("price"),
            p.get("thumbnail"),
            p["stock"] if p.get("stock") is not None else DEFAULT_QUANTITY,
        )
        for p in products
    ]
    with get_conn() as conn, conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO skus (external_id, title, price, thumbnail, quantity)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (external_id) DO UPDATE
               SET title = EXCLUDED.title,
                   price = EXCLUDED.price,
                   thumbnail = EXCLUDED.thumbnail
            """,
            rows,
        )
    return len(rows)


if __name__ == "__main__":
    open_pool()
    try:
        print(f"synced {sync_products()} products")
    finally:
        close_pool()
