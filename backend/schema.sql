-- Starting point. Change it as you see fit. Apply with:
--   psql postgresql://assessment:assessment@localhost:5432/assessment -f schema.sql
CREATE TABLE IF NOT EXISTS users (
    id            bigserial PRIMARY KEY,
    email         text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);
-- skus and selections are yours to design.
