import uuid
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from auth import auth_limiter
from db import get_conn
from main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def fresh_limiter():
    auth_limiter.reset()
    limit = auth_limiter.limit
    auth_limiter.limit = 1000
    yield
    auth_limiter.limit = limit
    auth_limiter.reset()


def register(client) -> dict:
    email = f"test-{uuid.uuid4().hex[:10]}@example.com"
    res = client.post("/auth/register", json={"email": email, "password": "secret1"})
    assert res.status_code == 201
    return {"email": email, **res.json()}


def bearer(session: dict) -> dict:
    return {"Authorization": f"Bearer {session['token']}"}


def make_sku(quantity: int) -> int:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "INSERT INTO skus (external_id, title, quantity) VALUES (%s, 'Test SKU', %s) RETURNING id",
            (-(uuid.uuid4().int % 10**9), quantity),
        )
        return cur.fetchone()[0]


def test_requires_token(client):
    assert client.get("/skus").status_code == 401


def test_only_one_user_gets_the_last_unit(client):
    sku_id = make_sku(1)
    users = [bearer(register(client)) for _ in range(8)]

    def pick(headers):
        return client.post("/selections", json={"sku_ids": [sku_id]}, headers=headers).status_code

    with ThreadPoolExecutor(max_workers=8) as pool:
        codes = list(pool.map(pick, users))

    assert codes.count(201) == 1
    assert codes.count(409) == 7
    assert client.get(f"/skus/{sku_id}", headers=users[0]).status_code == 404
    assert sku_id not in {s["id"] for s in client.get("/skus", headers=users[0]).json()}


def test_same_user_can_pick_again_until_sold_out(client):
    sku_id = make_sku(2)
    headers = bearer(register(client))
    assert client.post("/selections", json={"sku_ids": [sku_id]}, headers=headers).status_code == 201
    assert client.post("/selections", json={"sku_ids": [sku_id]}, headers=headers).status_code == 201
    assert client.post("/selections", json={"sku_ids": [sku_id]}, headers=headers).status_code == 409
    assert client.post("/selections", json={"sku_ids": [sku_id, sku_id]}, headers=headers).status_code == 422


def test_sync_is_idempotent(client):
    headers = bearer(register(client))
    client.post("/sync", headers=headers)
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM skus WHERE external_id > 0")
        before = cur.fetchone()[0]
    client.post("/sync", headers=headers)
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM skus WHERE external_id > 0")
        assert cur.fetchone()[0] == before


def test_refresh_rotates_and_old_token_is_single_use(client):
    session = register(client)
    first = client.post("/auth/refresh", json={"refresh_token": session["refresh_token"]})
    assert first.status_code == 200
    rotated = first.json()
    assert rotated["refresh_token"] != session["refresh_token"]
    assert client.get("/skus", headers=bearer(rotated)).status_code == 200
    reused = client.post("/auth/refresh", json={"refresh_token": session["refresh_token"]})
    assert reused.status_code == 401


def test_refresh_token_cannot_be_used_as_access_token(client):
    session = register(client)
    headers = {"Authorization": f"Bearer {session['refresh_token']}"}
    assert client.get("/skus", headers=headers).status_code == 401


def test_logout_revokes_refresh_token(client):
    session = register(client)
    res = client.post("/auth/logout", json={"refresh_token": session["refresh_token"]}, headers=bearer(session))
    assert res.status_code == 204
    assert client.post("/auth/refresh", json={"refresh_token": session["refresh_token"]}).status_code == 401


def test_login_is_rate_limited(client):
    auth_limiter.limit = 3
    body = {"email": "nobody@example.com", "password": "wrong-password"}
    codes = [client.post("/auth/login", json=body).status_code for _ in range(4)]
    assert codes == [401, 401, 401, 429]
