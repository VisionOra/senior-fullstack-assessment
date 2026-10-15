# Notes

## What I built
- Auth: `POST /auth/register` and `/auth/login` (bcrypt) return a 15-minute JWT access token plus a refresh token. Every other endpoint needs the access token; user id comes from the token only.
- Sessions: refresh tokens are random, stored only as SHA-256 hashes, and rotate on every `POST /auth/refresh` (single use, enforced by one `UPDATE ... RETURNING`). `POST /auth/logout` revokes. The app keeps the refresh token in the device keychain (`expo-secure-store`, localStorage on web), restores the session on launch, and refreshes once on a 401 before retrying.
- Rate limiting: register, login and refresh allow 10 attempts per minute per IP and path, then return 429 with `Retry-After`. In-memory, so per process.
- Migrations: numbered SQL files in `backend/migrations`, applied by `python migrate.py` and tracked in `schema_migrations`. No `psql` needed.
- Sync: `python sync.py` or `POST /sync`. Upserts on `external_id`, so running it twice creates no duplicates. Quantity is `stock` or 2, and is only set on first insert so a re-sync never restocks sold items.
- `GET /skus`, `GET /skus/{id}` (404 when sold out), `POST /selections` (1-2 ids).
- Repeat picks: a user may select the same SKU again in a later request while stock lasts; the same id twice in one request is rejected (422).
- Selections run in one transaction with `SELECT ... FOR UPDATE` on the rows in id order, then re-check quantity. Two users racing for the last unit: one gets 201, the other 409 `sold_out`. A DB `CHECK (quantity >= 0)` is the backstop.
- Login takes the same bcrypt time for unknown emails, so response timing does not reveal which emails are registered.
- Tests (`cd backend && pytest`, 8 tests): 8 users race for the last unit and exactly one wins; repeat picks until sold out; sync run twice adds no rows; missing or wrong-type tokens rejected; refresh rotation and reuse rejection; logout revokes; login rate limit. They create and migrate a separate `assessment_test` database and truncate it per run.
- Expo app: three-step onboarding (animated product collage, how picking works, category choice), login/register with inline validation, and a Discover listing with search, category chips (from the synced `category` field), sort and low-stock filter sheet, grid and list layouts, promo cards built from live data (lowest-stock item, per-category counts), image cards with price and units left, numbered picks in the accent color, and a bag bar that slides in on the first pick while the product image flies into it. Skeleton, empty, error and success states, pull to refresh, sign out. Cards are memoized so toggling one does not re-render the list.
- Design: light layout using the brief's palette. Cream is the background, navy replaces black for text and primary buttons, gold marks selection. Product art for onboarding and auth is bundled from the same public API.

## What I skipped on purpose and why
- No real promotions or discounts: promo cards only surface real stock and category data, since payments and pricing are out of scope.
- Rate limiting is in-memory per process. With several API instances it should move to Redis or the gateway.
- Refresh token reuse is rejected but does not revoke the rest of that user's sessions (reuse detection). Worth adding before production.
- No password reset, roles, admin, payments or pagination, per the brief.

## What I would do next
- CI running migrations and tests on every push.
- Restrict CORS to known origins, move `/sync` to a scheduled job or service role, rotate the JWT secret through a secrets manager.
- Refresh token reuse detection that revokes the whole session family.
- Search, sort and category filtering run on the client because the list is 12 items; a larger catalog would move these to the API.
- Push stock changes to open clients (websocket or polling) so a sold-out item disappears without a refresh.

## What I would change about the brief or the API I was given
- Say whether a user may select the same SKU twice, and whether the 1-2 limit is per request or lifetime. I read it as per request, repeats allowed.
- `/sync` access is undefined without roles; I left it open to any logged-in user.
- dummyjson always returns `stock`, so the "default to 2" branch is never exercised by the real API.

## AI tool usage
I used an AI coding assistant to help write and review this code. I reviewed the result and can walk through it.
