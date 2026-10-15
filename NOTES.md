# Notes

## What I built
- Auth: `POST /auth/register` and `/auth/login` (bcrypt, JWT). Every other endpoint needs the bearer token; user id comes from the token only.
- Sync: `python sync.py` or `POST /sync`. Upserts on `external_id`, so running it twice creates no duplicates. Quantity is `stock` or 2, and is only set on first insert so a re-sync never restocks sold items.
- `GET /skus`, `GET /skus/{id}` (404 when sold out), `POST /selections` (1-2 ids).
- Selections run in one transaction with `SELECT ... FOR UPDATE` on the rows in id order, then re-check quantity. Two users racing for the last unit: one gets 201, the other 409 `sold_out`. A DB `CHECK (quantity >= 0)` is the backstop.
- Expo app: login/register, items grid (max two selected), Confirm, refresh, sign out.

## What I skipped on purpose and why
- Token persistence: the token lives in memory, so a reload logs you out. Kept minimal per the brief.
- Tests, migrations tool (plain `schema.sql`), rate limiting, refresh tokens.
- A user can select a given SKU only once (unique constraint). The brief did not say; this seemed the safer reading.

## What I would do next
- Automated concurrency test, API tests, Alembic.
- Secure token storage, proper JWT secret handling, restrict CORS and `/sync` to a service role.
- Optimistic UI and a toast when a pick fails because someone else took the last unit.

## What I would change about the brief or the API I was given
- Say whether a user may select the same SKU twice, and whether the 1-2 limit is per request or lifetime.
- `/sync` access is undefined without roles; I left it open to any logged-in user.
- dummyjson always returns `stock`, so the "default to 2" branch is never exercised by the real API.
