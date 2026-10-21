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
  const paidDelivery = await prisma.order.updateMany({
    where: { deliveryFee: { gt: 0 }, deliveryFeeStatus: 'PENDING' },
    data: { deliveryFeeStatus: 'SET' }
  });

  const freeDelivery = await prisma.order.updateMany({
    where: { deliveryFee: 0, deliveryFeeStatus: 'PENDING', status: { in: ['SHIPPED', 'DELIVERED'] } },
    data: { deliveryFeeStatus: 'FREE' }
  });

  console.log(`Delivery fee status backfill complete. SET: ${paidDelivery.count}, FREE legacy shipped/delivered: ${freeDelivery.count}`);
}

main()
  .catch((error) => {
    console.error('Delivery fee status backfill failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
