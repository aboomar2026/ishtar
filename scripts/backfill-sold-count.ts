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

async function main() {
  const salesByProduct = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      order: { status: { not: 'CANCELED' } }
    },
    _sum: { quantity: true }
  });

  let updatedProducts = 0;

  for (const group of salesByProduct) {
    const soldQuantity = group._sum.quantity ?? 0;
    if (soldQuantity <= 0) continue;

    const result = await prisma.product.updateMany({
      where: {
        id: group.productId,
        soldCount: { lt: soldQuantity }
      },
      data: { soldCount: soldQuantity }
    });

    updatedProducts += result.count;
  }

  console.log(`Sold counts backfilled. Products updated: ${updatedProducts}`);
}

main()
  .catch((error) => {
    console.error('Failed to backfill sold counts', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
