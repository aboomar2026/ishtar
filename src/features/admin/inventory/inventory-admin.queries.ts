import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { ProductStockState } from '@/features/catalog/catalog.types';
import { variantStockState } from '@/features/admin/shared/admin-format';

export type InventoryFilter = 'all' | 'low-stock' | 'out-of-stock' | 'inactive';

export type InventoryRow = {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  image: string | null;
  sku: string;
  colorName: string | null;
  colorValue: string | null;
  size: string | null;
  quantity: number;
  lowStockThreshold: number;
  stockState: ProductStockState;
  isActive: boolean;
  updatedAt: Date;
};

const FALLBACK_IMAGE = '/mock-products/gift-box.svg';

export async function getInventoryVariants(params: { q?: string; filter?: InventoryFilter } = {}): Promise<InventoryRow[]> {
  const { q, filter = 'all' } = params;

  const where: Prisma.ProductVariantWhereInput = {};
  const term = q?.trim();
  if (term) {
    where.OR = [
      { sku: { contains: term, mode: 'insensitive' } },
      { product: { name: { contains: term, mode: 'insensitive' } } }
    ];
  }
  if (filter === 'inactive') where.isActive = false;
  if (filter === 'out-of-stock') where.quantity = { lte: 0 };

  const variants = await prisma.productVariant.findMany({
    where,
    orderBy: [{ updatedAt: 'desc' }],
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { url: true } }
        }
      }
    }
  });

  let rows: InventoryRow[] = variants.map((variant) => ({
    id: variant.id,
    productId: variant.product.id,
    productName: variant.product.name,
    productSlug: variant.product.slug,
    image: variant.product.images[0]?.url ?? FALLBACK_IMAGE,
    sku: variant.sku,
    colorName: variant.colorName,
    colorValue: variant.colorValue,
    size: variant.size,
    quantity: variant.quantity,
    lowStockThreshold: variant.lowStockThreshold,
    stockState: variantStockState(variant.quantity, variant.lowStockThreshold),
    isActive: variant.isActive,
    updatedAt: variant.updatedAt
  }));

  if (filter === 'low-stock') {
    rows = rows.filter((row) => row.stockState === 'low-stock');
  }

  return rows;
}
