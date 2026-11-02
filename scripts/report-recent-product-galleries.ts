/**
 * Read-only production gallery mapping report.
 * Usage: node --env-file=.env.local --import tsx scripts/report-recent-product-galleries.ts
 * No customer/order data or secrets are printed.
 */
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
try {
  const rows = await db.product.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 40,
    select: {
      id: true, name: true, slug: true, createdAt: true,
      images: { select: { isPrimary: true, url: true }, orderBy: { sortOrder: 'asc' } }
    }
  });
  console.log(JSON.stringify(rows.map(({images, ...product}) => ({
    ...product,
    createdAt: product.createdAt.toISOString(),
    imageCount: images.length,
    originalImageHost: images[0]?.url ? new URL(images[0].url).host : null,
    primaryImageCount: images.filter(x => x.isPrimary).length
  })), null, 2));
} finally {
  await db.$disconnect();
}
