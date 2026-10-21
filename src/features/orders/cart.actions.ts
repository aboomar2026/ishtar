'use server';

import { prisma } from '@/lib/prisma';

/** Read current public variant prices and availability before checkout. */
export async function getCartAvailability(ids: string[]) {
  const variantIds = [...new Set(ids)].filter((id) => typeof id === 'string' && id.length <= 100).slice(0, 100);
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: { product: { select: { status: true, category: { select: { isActive: true } } } } }
  });
  return variants.map((variant) => ({
    id: variant.id,
    quantity: variant.isActive && variant.product.status === 'ACTIVE' && variant.product.category?.isActive ? variant.quantity : 0,
    price: variant.price.toNumber(),
    compareAtPrice: variant.compareAtPrice?.toNumber()
  }));
}
