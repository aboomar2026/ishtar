-- Additive schema change. Review and apply to a TEST database first.
-- This repository has no Prisma migration baseline: do not run migrate deploy
-- against an existing database without establishing its migration history.
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "checkoutRequestKey" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "checkoutFingerprint" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Order_checkoutRequestKey_key" ON "Order"("checkoutRequestKey");
