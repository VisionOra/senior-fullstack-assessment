ALTER TABLE selections DROP CONSTRAINT IF EXISTS selections_user_id_sku_id_key;
CREATE INDEX IF NOT EXISTS selections_user_id_idx ON selections (user_id);
CREATE INDEX IF NOT EXISTS selections_sku_id_idx ON selections (sku_id);
