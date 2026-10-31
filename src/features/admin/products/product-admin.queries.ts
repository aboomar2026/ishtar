import 'server-only';
import { Prisma, type ProductStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { CatalogProductImage, ProductStockState } from '@/features/catalog/catalog.types';
import { getStockState } from '@/features/catalog/catalog.utils';

export type AdminProductStockFilter = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
export type AdminProductSort = 'newest' | 'updated' | 'name' | 'stock-asc';

export type AdminProductListParams = {
  q?: string;
  page?: number;
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
  categoryActive: boolean;
  images: CatalogProductImage[];
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

export async function getAdminProductPage(params: AdminProductListParams = {}) {
  const { q, status = 'ALL', categoryId = 'ALL', stock = 'all', sort = 'updated' } = params;
  const requestedPage = Number.isFinite(params.page) ? Math.min(1_000_000, Math.max(1, Math.floor(params.page!))) : 1;
  const pageSize = 24;
  const conditions: Prisma.Sql[] = [Prisma.sql`p."deletedAt" IS NULL`];
  if (status !== 'ALL') conditions.push(Prisma.sql`p.status::text = ${status}`);
  if (categoryId !== 'ALL') conditions.push(Prisma.sql`p."categoryId" = ${categoryId}`);
  const term = q?.trim();
  if (term) {
    const pattern = `%${term.replace(/[\\%_]/g, character => `\\${character}`)}%`;
    conditions.push(Prisma.sql`(p.name ILIKE ${pattern} OR p.slug ILIKE ${pattern} OR EXISTS (SELECT 1 FROM "ProductVariant" v WHERE v."productId" = p.id AND v.sku ILIKE ${pattern}))`);
  }
  if (stock === 'out-of-stock') conditions.push(Prisma.sql`s.quantity <= 0`);
  if (stock === 'low-stock') conditions.push(Prisma.sql`s.quantity > 0 AND s.quantity <= s.threshold`);
  if (stock === 'in-stock') conditions.push(Prisma.sql`s.quantity > s.threshold AND s.quantity > 0`);
  const order = sort === 'stock-asc' ? Prisma.sql`quantity ASC` : sort === 'name' ? Prisma.sql`name ASC` : sort === 'newest' ? Prisma.sql`"createdAt" DESC` : Prisma.sql`"updatedAt" DESC`;
  // Filter and sort the aggregate BEFORE pagination; hydrate at most 24 products.
  const [selection] = await prisma.$queryRaw<{ total: bigint; ids: string[] }[]>(Prisma.sql`
    WITH filtered AS (
      SELECT p.id, p.name, p."createdAt", p."updatedAt", s.quantity FROM "Product" p
      JOIN LATERAL (SELECT COALESCE(SUM(GREATEST(quantity, 0)) FILTER (WHERE "isActive"), 0) AS quantity,
        COALESCE(MIN("lowStockThreshold") FILTER (WHERE "isActive"), 0) AS threshold
        FROM "ProductVariant" WHERE "productId" = p.id) s ON true
      WHERE ${Prisma.join(conditions, ' AND ')}
    ), total AS (SELECT COUNT(*) AS total FROM filtered), paged AS (
      SELECT * FROM filtered ORDER BY ${order}, id ASC LIMIT ${pageSize}
      OFFSET (SELECT GREATEST(0, LEAST(${requestedPage - 1}, CEIL(total::numeric / ${pageSize}) - 1)) * ${pageSize} FROM total)
    ) SELECT total, ARRAY(SELECT id FROM paged ORDER BY ${order}, id ASC) AS ids FROM total`);
  const total = Number(selection?.total ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pageCount, requestedPage);
  const ids = selection?.ids ?? [];
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, deletedAt: null },
    include: {
      category: { select: { name: true, isActive: true } },
      images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], select: { id: true, url: true, alt: true, sortOrder: true, isPrimary: true } },
      variants: { select: { quantity: true, lowStockThreshold: true, isActive: true } }
    }
  });

  const items: AdminProductListItem[] = products.map((product) => {
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
      categoryActive: product.category.isActive,
      images: product.images.map(image => ({ ...image, alt: image.alt ?? undefined })),
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

  const byId = new Map(items.map(item => [item.id, item]));
  return { items: ids.flatMap(id => byId.has(id) ? [byId.get(id)!] : []), total, page, pageCount };

}

export type AdminProductDetail = NonNullable<Awaited<ReturnType<typeof getAdminProductById>>>;

export async function getAdminProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id, deletedAt: null },
    include: {
      category: { select: { isActive: true } },
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
    categoryActive: product.category.isActive,
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
