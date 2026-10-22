-- Additive and repeatable: existing catalog/order tables are not modified.
CREATE TABLE IF NOT EXISTS "HeroSettings" (
  "id" TEXT NOT NULL DEFAULT 'home',
  "config" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HeroSettings_pkey" PRIMARY KEY ("id")
);
