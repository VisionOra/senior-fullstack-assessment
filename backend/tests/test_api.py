import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from db import get_conn
from main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def register(client) -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    res = client.post("/auth/register", json={"email": email, "password": "secret1"})
    assert res.status_code == 201
    return {"Authorization": f"Bearer {res.json()['token']}"}


@pytest.fixture
def last_unit_sku():
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "INSERT INTO skus (external_id, title, quantity) VALUES (%s, 'Test SKU', 1) RETURNING id",
            (-uuid.uuid4().int % 10**9,),
        )
        sku_id = cur.fetchone()[0]
    yield sku_id
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM selections WHERE sku_id = %s", (sku_id,))
        cur.execute("DELETE FROM skus WHERE id = %s", (sku_id,))


def test_requires_token(client):
    assert client.get("/skus").status_code == 401


def test_only_one_user_gets_the_last_unit(client, last_unit_sku):
    users = [register(client) for _ in range(8)]

    def pick(headers):
        return client.post("/selections", json={"sku_ids": [last_unit_sku]}, headers=headers).status_code

    with ThreadPoolExecutor(max_workers=8) as pool:
        codes = list(pool.map(pick, users))

    assert codes.count(201) == 1
    assert codes.count(409) == 7
    assert client.get(f"/skus/{last_unit_sku}", headers=users[0]).status_code == 404
    listed = {s["id"] for s in client.get("/skus", headers=users[0]).json()}
    assert last_unit_sku not in listed


def test_sync_is_idempotent(client):
    headers = register(client)
    client.post("/sync", headers=headers)
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM skus WHERE external_id > 0")
        before = cur.fetchone()[0]
    client.post("/sync", headers=headers)
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM skus WHERE external_id > 0")
        assert cur.fetchone()[0] == before
