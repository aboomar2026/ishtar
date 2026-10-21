import 'server-only';
import type { Prisma, ProductStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { ProductStockState } from '@/features/catalog/catalog.types';
import { getStockState } from '@/features/catalog/catalog.utils';

export type AdminProductStockFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
export type AdminProductSort = 'newest' | 'updated' | 'name' | 'stock-asc';

export type AdminProductListParams = {
  q?: string;
  status?: ProductStatus | 'ALL';
  categoryId?: string | 'ALL';
  stock?: AdminProductStockFilter;
  sort?: AdminProductSort;
};

export type AdminProductListItem = {
  id: string;
  name: string;
  slug: string;
  categoryName: string;
  status: ProductStatus;
  basePrice: number;
  image: string | null;
  variantCount: number;
  totalStock: number;
  stockState: ProductStockState;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  updatedAt: Date;
};

const FALLBACK_IMAGE = '/mock-products/gift-box.svg';

function decimalToNumber(value: Prisma.Decimal | number | string | null): number {
  if (value === null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return value.toNumber();
}

export async function getAdminProducts(params: AdminProductListParams = {}): Promise<AdminProductListItem[]> {
  const { q, status = 'ALL', categoryId = 'ALL', stock = 'all', sort = 'updated' } = params;

  const where: Prisma.ProductWhereInput = {};
  if (status !== 'ALL') where.status = status;
  if (categoryId !== 'ALL') where.categoryId = categoryId;

  const term = q?.trim();
  if (term) {
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { slug: { contains: term, mode: 'insensitive' } },
      { variants: { some: { sku: { contains: term, mode: 'insensitive' } } } }
    ];
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === 'newest'
      ? { createdAt: 'desc' }
      : sort === 'name'
        ? { name: 'asc' }
        : { updatedAt: 'desc' };

  const products = await prisma.product.findMany({
    where,
    orderBy,
    include: {
      category: { select: { name: true } },
      images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
      variants: { select: { quantity: true, lowStockThreshold: true, isActive: true } }
    }
  });

  let items: AdminProductListItem[] = products.map((product) => {
    const activeVariants = product.variants.filter((variant) => variant.isActive);
    const totalStock = activeVariants.reduce((sum, variant) => sum + Math.max(0, variant.quantity), 0);
    const lowestThreshold = activeVariants.length
      ? Math.min(...activeVariants.map((variant) => variant.lowStockThreshold))
      : 0;
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      categoryName: product.category?.name ?? '—',
      status: product.status,
      basePrice: decimalToNumber(product.basePrice),
      image: product.images[0]?.url ?? FALLBACK_IMAGE,
      variantCount: product.variants.length,
      totalStock,
      stockState: getStockState(totalStock, lowestThreshold),
      isFeatured: product.isFeatured,
      isNewArrival: product.isNewArrival,
      isBestSeller: product.isBestSeller,
      updatedAt: product.updatedAt
    };
  });

  if (stock !== 'all') {
    items = items.filter((item) => item.stockState === stock);
  }
  if (sort === 'stock-asc') {
    items = [...items].sort((a, b) => a.totalStock - b.totalStock);
  }

  return items;
}

export type AdminProductDetail = NonNullable<Awaited<ReturnType<typeof getAdminProductById>>>;

export async function getAdminProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: 'asc' } },
      variants: { orderBy: [{ colorName: 'asc' }, { size: 'asc' }] }
    }
  });
  if (!product) return null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    subtitle: product.subtitle ?? '',
    description: product.description,
    details: Array.isArray(product.details) ? (product.details as unknown[]).filter((d): d is string => typeof d === 'string') : [],
    careInstructions: product.careInstructions ?? '',
    brand: product.brand ?? '',
    categoryId: product.categoryId,
    basePrice: decimalToNumber(product.basePrice),
    compareAtPrice: product.compareAtPrice === null ? undefined : decimalToNumber(product.compareAtPrice),
    status: product.status,
    isFeatured: product.isFeatured,
    isNewArrival: product.isNewArrival,
    isBestSeller: product.isBestSeller,
    tags: product.tags,
    images: product.images.map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt ?? '',
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary,
      cloudinaryPublicId: image.cloudinaryPublicId ?? ''
    })),
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      colorName: variant.colorName ?? '',
      colorValue: variant.colorValue ?? '',
      size: variant.size ?? '',
      price: decimalToNumber(variant.price),
      compareAtPrice: variant.compareAtPrice === null ? undefined : decimalToNumber(variant.compareAtPrice),
      quantity: variant.quantity,
      lowStockThreshold: variant.lowStockThreshold,
      isActive: variant.isActive
    }))
  };
}

export async function getCategoryOptions() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, isActive: true }
  });
  return categories;
}
