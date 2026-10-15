# Notes

## What I built
- Auth: `POST /auth/register` and `/auth/login` (bcrypt, JWT). Every other endpoint needs the bearer token; user id comes from the token only.
- Sync: `python sync.py` or `POST /sync`. Upserts on `external_id`, so running it twice creates no duplicates. Quantity is `stock` or 2, and is only set on first insert so a re-sync never restocks sold items.
- `GET /skus`, `GET /skus/{id}` (404 when sold out), `POST /selections` (1-2 ids).
- Selections run in one transaction with `SELECT ... FOR UPDATE` on the rows in id order, then re-check quantity. Two users racing for the last unit: one gets 201, the other 409 `sold_out`. A DB `CHECK (quantity >= 0)` is the backstop.
- Login takes the same bcrypt time for unknown emails, so response timing does not reveal which emails are registered.
- Tests (`cd backend && pytest`): 8 users race for the last unit and exactly one wins; sync run twice adds no rows; endpoints reject missing tokens. They run against the local Postgres.
- Expo app: three-step onboarding (animated product collage, how picking works, category choice), login/register with inline validation, and a Discover listing with search, category chips (from the synced `category` field), image cards with price and units left, numbered picks in the accent color and a floating Confirm bar. Skeleton, empty, error and success states, pull to refresh, sign out. Cards are memoized so toggling one does not re-render the list.
- Design: light layout using the brief's palette. Cream is the background, navy replaces black for text and primary buttons, gold marks selection. Product art for onboarding and auth is bundled from the same public API.

## What I skipped on purpose and why
- Token persistence: the token lives in memory, so a reload logs you out. Kept minimal per the brief.
- Migrations tool (plain `schema.sql`), rate limiting, refresh tokens. Tests use the dev database instead of an isolated one.
- A user can select a given SKU only once (unique constraint). The brief did not say; this seemed the safer reading.

## What I would do next
- Separate test database and CI, Alembic migrations.
- Secure token storage, proper JWT secret handling, restrict CORS and `/sync` to a service role.
- Optimistic UI and a toast when a pick fails because someone else took the last unit.

- Search and category filtering run on the client because the list is 12 items; a larger catalog would move this to the API.

## What I would change about the brief or the API I was given
- Say whether a user may select the same SKU twice, and whether the 1-2 limit is per request or lifetime.
- `/sync` access is undefined without roles; I left it open to any logged-in user.
- dummyjson always returns `stock`, so the "default to 2" branch is never exercised by the real API.

## AI tool usage
I used an AI coding assistant to help write and review this code. I reviewed the result and can walk through it.
