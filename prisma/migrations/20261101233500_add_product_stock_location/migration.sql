-- Internal-only sourcing label. Existing products receive the same default.
ALTER TABLE "Product"
ADD COLUMN "stockLocation" TEXT NOT NULL DEFAULT 'مخزون جوليا';
