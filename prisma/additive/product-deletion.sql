-- Apply BEFORE deploying the product deletion release. Additive and repeatable.
-- Existing products remain visible; no product, order or inventory data is removed.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE public."Product" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
COMMIT;
