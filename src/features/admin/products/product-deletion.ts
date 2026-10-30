import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/** Preserve accounting and stock history; serialize with checkout and product edits. */
export async function deleteProduct(id: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "ProductVariant" WHERE "productId" = ${id} ORDER BY id FOR UPDATE`);
    await tx.$queryRaw(Prisma.sql`SELECT id FROM "Product" WHERE id = ${id} FOR UPDATE`);
    const product = await tx.product.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
    if (!product) return { ok: false as const, message: 'المنتج غير موجود.' };
    if (product.deletedAt) return { ok: true as const };
    await tx.product.update({ where: { id }, data: { deletedAt: new Date(), status: 'ARCHIVED' } });
    await tx.productVariant.updateMany({ where: { productId: id }, data: { isActive: false } });
    // Keep quantities, images, relationships, order snapshots and financial totals.
    return { ok: true as const };
  }, { maxWait: 10_000, timeout: 20_000 });
}
