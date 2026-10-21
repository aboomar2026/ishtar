import path from 'node:path';
import { PrismaClient } from '@prisma/client';

function ensureEnvLoaded(): void {
  if (process.env.DATABASE_URL) return;
  const loader = (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile;
  if (typeof loader === 'function') {
    try {
      loader.call(process, path.resolve(process.cwd(), '.env'));
    } catch {
      /* .env is optional when vars are already exported */
    }
  }
}

ensureEnvLoaded();

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('Backfilling inventory ledger baselines...');

  const variants = await prisma.productVariant.findMany({
    select: {
      id: true,
      productId: true,
      sku: true,
      quantity: true,
      product: { select: { name: true } }
    },
    orderBy: { createdAt: 'asc' }
  });

  const logSums = await prisma.inventoryLog.groupBy({
    by: ['variantId'],
    _sum: { quantityChange: true }
  });
  const ledgerQuantityByVariant = new Map(logSums.map((row) => [row.variantId, row._sum.quantityChange ?? 0]));

  let created = 0;
  for (const variant of variants) {
    const ledgerQuantity = ledgerQuantityByVariant.get(variant.id) ?? 0;
    const delta = variant.quantity - ledgerQuantity;
    if (delta === 0) continue;

    await prisma.inventoryLog.create({
      data: {
        productId: variant.productId,
        variantId: variant.id,
        type: 'MANUAL_ADJUSTMENT',
        quantityChange: delta,
        note: `Backfilled inventory baseline. Current stock=${variant.quantity}, previous ledger=${ledgerQuantity}, SKU=${variant.sku}`
      }
    });
    created += 1;
    console.log(`Backfilled ${variant.product.name} / ${variant.sku}: ${delta > 0 ? '+' : ''}${delta}`);
  }

  if (created === 0) {
    console.log('✅ Inventory ledger already matches current stock. No backfill needed.');
  } else {
    console.log(`✅ Created ${created} inventory baseline log(s).`);
  }
}

main()
  .catch((error) => {
    console.error('Inventory ledger backfill failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
