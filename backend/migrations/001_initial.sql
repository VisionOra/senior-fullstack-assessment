CREATE TABLE IF NOT EXISTS users (
    id            bigserial PRIMARY KEY,
    email         text UNIQUE NOT NULL,
    password_hash text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skus (
    id          bigserial PRIMARY KEY,
    external_id bigint UNIQUE NOT NULL,
    title       text NOT NULL,
    price       numeric(10, 2),
    thumbnail   text,
    category    text,
    quantity    integer NOT NULL DEFAULT 2 CHECK (quantity >= 0),
    created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE skus ADD COLUMN IF NOT EXISTS category text;

CREATE TABLE IF NOT EXISTS selections (
    id         bigserial PRIMARY KEY,
    user_id    bigint NOT NULL REFERENCES users(id),
    sku_id     bigint NOT NULL REFERENCES skus(id),
    created_at timestamptz NOT NULL DEFAULT now()
);
