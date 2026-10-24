-- Owner-run additive migration. No product, stock or order data is changed.
BEGIN;

CREATE TABLE IF NOT EXISTS "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "imageUrl" TEXT,
    "symbol" TEXT NOT NULL DEFAULT 'sparkle',
    "tone" TEXT NOT NULL DEFAULT 'rose',
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "showOnHome" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CollectionProduct" (
    "collectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CollectionProduct_pkey" PRIMARY KEY ("collectionId","productId")
);

CREATE TABLE IF NOT EXISTS "ProductComplement" (
    "productId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductComplement_pkey" PRIMARY KEY ("productId","targetId")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Collection_slug_key" ON "Collection"("slug");

CREATE INDEX IF NOT EXISTS "Collection_isActive_showOnHome_sortOrder_idx" ON "Collection"("isActive", "showOnHome", "sortOrder");

CREATE INDEX IF NOT EXISTS "CollectionProduct_productId_idx" ON "CollectionProduct"("productId");

CREATE INDEX IF NOT EXISTS "CollectionProduct_collectionId_sortOrder_idx" ON "CollectionProduct"("collectionId", "sortOrder");

CREATE INDEX IF NOT EXISTS "ProductComplement_targetId_idx" ON "ProductComplement"("targetId");

DO $$ BEGIN ALTER TABLE "CollectionProduct" ADD CONSTRAINT "CollectionProduct_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "CollectionProduct" ADD CONSTRAINT "CollectionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "ProductComplement" ADD CONSTRAINT "ProductComplement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "ProductComplement" ADD CONSTRAINT "ProductComplement_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN ALTER TABLE "ProductComplement" ADD CONSTRAINT "ProductComplement_no_self" CHECK ("productId" <> "targetId"); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Collection" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "CollectionProduct" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "ProductComplement" ENABLE ROW LEVEL SECURITY;

COMMIT;
