-- Product deletion was merged alongside the Vercel setup.
-- Apply separately because the initial migration has already run on Prisma.
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
