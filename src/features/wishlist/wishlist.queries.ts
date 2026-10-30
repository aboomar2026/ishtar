import 'server-only';
import { prisma } from '@/lib/prisma';
import { mapProductCard } from '@/features/catalog/catalog.mappers';
import { sanitizeWishlist } from './wishlist-storage';
export async function getWishlistProducts(input: string[]) {
  const ids = sanitizeWishlist(input);
  if (!ids.length) return { products: [], unavailableIds: [] };
  const rows = await prisma.product.findMany({ where: { id: { in: ids }, deletedAt: null, status: 'ACTIVE', category: { isActive: true } },
    include: { category: true, images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
      variants: { where: { isActive: true }, orderBy: [{ colorName: 'asc' }, { size: 'asc' }] } } });
  const byId = new Map(rows.map(row => [row.id, mapProductCard(row)]));
  return { products: ids.flatMap(id => byId.has(id) ? [byId.get(id)!] : []), unavailableIds: ids.filter(id => !byId.has(id)) };
}
