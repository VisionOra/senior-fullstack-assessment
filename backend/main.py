from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from psycopg.errors import UniqueViolation
from psycopg.rows import dict_row

from auth import api_error, create_token, current_user_id, hash_password, verify_password
from db import close_pool, get_conn, open_pool
from sync import sync_products


@asynccontextmanager
async def lifespan(_: FastAPI):
    open_pool()
    yield
    close_pool()


app = FastAPI(title="Assessment API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)



@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    first = exc.errors()[0]
    field = ".".join(str(p) for p in first["loc"] if p != "body")
    return JSONResponse(
        status_code=422,
        content={"detail": {"code": "validation_error", "message": f"{field}: {first['msg']}"}},
    )


SKU_COLUMNS = "id, title, price, thumbnail, quantity"


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)


class SelectionIn(BaseModel):
    sku_ids: list[int] = Field(min_length=1, max_length=2)


@app.get("/health")
def health():
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT 1")
        cur.fetchone()
    return {"ok": True}


@app.post("/auth/register", status_code=201)
def register(body: Credentials):
    email = body.email.lower()
    try:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (email, password_hash) VALUES (%s, %s) RETURNING id",
                (email, hash_password(body.password)),
            )
            user_id = cur.fetchone()[0]
    except UniqueViolation:
        raise api_error(409, "email_taken", "An account with this email already exists")
    return {"token": create_token(user_id)}


@app.post("/auth/login")
def login(body: Credentials):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, password_hash FROM users WHERE email = %s", (body.email.lower(),)
        )
        row = cur.fetchone()
    if not row or not verify_password(body.password, row[1]):
        raise api_error(401, "invalid_credentials", "Wrong email or password")
    return {"token": create_token(row[0])}


@app.post("/sync")
def sync(_: int = Depends(current_user_id)):
    return {"synced": sync_products()}


@app.get("/skus")
def list_skus(_: int = Depends(current_user_id)):
    with get_conn() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(f"SELECT {SKU_COLUMNS} FROM skus WHERE quantity > 0 ORDER BY id")
        return cur.fetchall()


@app.get("/skus/{sku_id}")
def get_sku(sku_id: int, _: int = Depends(current_user_id)):
    with get_conn() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            f"SELECT {SKU_COLUMNS} FROM skus WHERE id = %s AND quantity > 0", (sku_id,)
        )
        row = cur.fetchone()
    if not row:
        raise api_error(404, "sku_not_found", "SKU not found")
    return row


@app.post("/selections", status_code=201)
def create_selection(body: SelectionIn, user_id: int = Depends(current_user_id)):
    ids = sorted(set(body.sku_ids))
    if len(ids) != len(body.sku_ids):
        raise api_error(422, "duplicate_sku", "Each SKU can only be selected once")
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, quantity FROM skus WHERE id = ANY(%s) ORDER BY id FOR UPDATE",
            (ids,),
        )
        found = dict(cur.fetchall())
        if len(found) != len(ids):
            raise api_error(404, "sku_not_found", "One or more SKUs do not exist")
        sold_out = [i for i in ids if found[i] <= 0]
        if sold_out:
            raise api_error(
                409, "sold_out", f"SKU(s) no longer available: {', '.join(map(str, sold_out))}"
            )
        try:
            cur.executemany(
                "INSERT INTO selections (user_id, sku_id) VALUES (%s, %s)",
                [(user_id, i) for i in ids],
            )
        except UniqueViolation:
            raise api_error(409, "already_selected", "You already selected one of these SKUs")
        cur.execute("UPDATE skus SET quantity = quantity - 1 WHERE id = ANY(%s)", (ids,))
    return {"sku_ids": ids}
