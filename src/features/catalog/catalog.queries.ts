import { collectionsReady } from '@/features/collections/collections.storage';
import { cache } from 'react';
import { Prisma, type BannerPlacement } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { CatalogProductFilters, CategoryProductsResult, HomeCatalogResult } from './catalog.types';
import { mapBanner, mapCategory, mapProductCard, mapProductDetail } from './catalog.mappers';
import { getVirtualCategory } from './catalog.utils';

export const productListInclude = {
  category: true,
  images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
  variants: { where: { isActive: true }, orderBy: [{ colorName: 'asc' }, { size: 'asc' }] }
} satisfies Prisma.ProductInclude;

const categoryInclude = {
  _count: {
    select: {
      products: { where: { deletedAt: null, status: 'ACTIVE' } }
    }
  }
} satisfies Prisma.CategoryInclude;

function activeProductWhere(filters: CatalogProductFilters = {}): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    deletedAt: null, status: 'ACTIVE',
    category: { isActive: true }
  };

  if (filters.categorySlug) {
    if (filters.categorySlug === 'new-in') {
      where.isNewArrival = true;
    } else if (filters.categorySlug === 'sale') {
      where.OR = [
        { compareAtPrice: { not: null } },
        { variants: { some: { isActive: true, compareAtPrice: { not: null } } } }
      ];
    } else if (filters.categorySlug === 'featured') {
      where.isFeatured = true;
    } else if (filters.categorySlug !== 'all') {
      where.category = { slug: filters.categorySlug, isActive: true };
    }
  }

  if (filters.q) {
    const searchWhere: Prisma.ProductWhereInput = {
      OR: [
        { name: { contains: filters.q, mode: 'insensitive' } },
        { subtitle: { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
        { brand: { contains: filters.q, mode: 'insensitive' } },
        { tags: { has: filters.q } }
      ]
    };
    where.AND = Array.isArray(where.AND) ? [...where.AND, searchWhere] : [searchWhere];
  }

  if (filters.availability === 'in-stock') {
    const stockWhere: Prisma.ProductWhereInput = {
      variants: { some: { isActive: true, quantity: { gt: 0 } } }
    };
    where.AND = Array.isArray(where.AND) ? [...where.AND, stockWhere] : [stockWhere];
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const priceWhere: Prisma.ProductWhereInput = {
      basePrice: {
        gte: filters.minPrice,
        lte: filters.maxPrice
      }
    };
    where.AND = Array.isArray(where.AND) ? [...where.AND, priceWhere] : [priceWhere];
  }

  return where;
}

async function withEffectiveSoldCounts<T extends { id: string; soldCount: number }>(products: T[]): Promise<T[]> {
  const productIds = products.map((product) => product.id);
  if (productIds.length === 0) return products;

  const soldRows = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      productId: { in: productIds },
      order: { status: { not: 'CANCELED' } }
    },
    _sum: { quantity: true }
  });

  const soldCountByProduct = new Map(soldRows.map((row) => [row.productId, row._sum.quantity ?? 0]));

  return products.map((product) => ({
    ...product,
    soldCount: soldCountByProduct.get(product.id) ?? 0
  }));
}

async function getProductPage(filters: CatalogProductFilters = {}) {
  const limit = Math.min(48, Math.max(1, filters.limit ?? 24));
  const page = Math.max(1, filters.page ?? 1);
  const conditions = [Prisma.sql`p."deletedAt" IS NULL AND p.status = 'ACTIVE' AND c."isActive" = true`];
  if (filters.categorySlug === 'new-in') conditions.push(Prisma.sql`p."isNewArrival" = true`);
  else if (filters.categorySlug === 'featured') conditions.push(Prisma.sql`p."isFeatured" = true`);
  else if (filters.categorySlug && !['all', 'sale'].includes(filters.categorySlug)) conditions.push(Prisma.sql`c.slug = ${filters.categorySlug}`);
  if (filters.q) {
    const pattern = `%${filters.q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
    const collectionMatch = await collectionsReady() ? Prisma.sql`OR EXISTS (SELECT 1 FROM "CollectionProduct" cp JOIN "Collection" co ON co.id = cp."collectionId" WHERE cp."productId" = p.id AND co."isActive" AND (co.name ILIKE ${pattern} OR ${filters.q} = ANY(co.keywords)))` : Prisma.empty;
    conditions.push(Prisma.sql`(p.name ILIKE ${pattern} OR p.subtitle ILIKE ${pattern} OR p.description ILIKE ${pattern} OR p.brand ILIKE ${pattern} OR ${filters.q} = ANY(p.tags) ${collectionMatch})`);
  }
  if (filters.availability === 'in-stock') conditions.push(Prisma.sql`v.stock > 0`);
  if (filters.minPrice != null) conditions.push(Prisma.sql`v.price >= ${filters.minPrice}`);
  if (filters.maxPrice != null) conditions.push(Prisma.sql`v.price <= ${filters.maxPrice}`);
  if (filters.categorySlug === 'sale') conditions.push(Prisma.sql`EXISTS (SELECT 1 FROM "ProductVariant" d WHERE d."productId" = p.id AND d."isActive" AND d.price = v.price AND (d.quantity > 0 OR v.stock = 0) AND COALESCE(d."compareAtPrice", p."compareAtPrice") > d.price)`);
  const salesJoin = Prisma.sql`LEFT JOIN LATERAL (SELECT COALESCE(SUM(i.quantity),0) AS sold FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId" WHERE i."productId" = p.id AND o.status <> 'CANCELED') sales ON true`;
  const rankBySales = filters.sort === 'best-sellers';
  const from = Prisma.sql`FROM "Product" p JOIN "Category" c ON c.id = p."categoryId"
    JOIN LATERAL (SELECT COALESCE(MIN(price) FILTER (WHERE quantity > 0), MIN(price), p."basePrice") AS price, COALESCE(SUM(quantity),0) AS stock
      FROM "ProductVariant" WHERE "productId" = p.id AND "isActive" = true) v ON true
    ${rankBySales ? salesJoin : Prisma.empty}
    WHERE ${Prisma.join(conditions, ' AND ')}`;
  const order = filters.sort === 'price-asc' ? Prisma.sql`v.price ASC` : filters.sort === 'price-desc' ? Prisma.sql`v.price DESC` : filters.sort === 'best-sellers' ? Prisma.sql`sales.sold DESC` : Prisma.sql`p."createdAt" DESC`;
  const rows = await prisma.$queryRaw<{ id: string; total: bigint; sold: bigint }[]>(rankBySales
    ? Prisma.sql`SELECT p.id, COUNT(*) OVER() AS total, sales.sold ${from} ORDER BY ${order}, p."createdAt" DESC, p.id ASC LIMIT ${limit} OFFSET ${(page - 1) * limit}`
    : Prisma.sql`WITH page AS MATERIALIZED (
        SELECT p.id, COUNT(*) OVER() AS total, ROW_NUMBER() OVER (ORDER BY ${order}, p."createdAt" DESC, p.id ASC) AS position
        ${from} ORDER BY ${order}, p."createdAt" DESC, p.id ASC LIMIT ${limit} OFFSET ${(page - 1) * limit}
      ) SELECT page.id, page.total, COALESCE((SELECT SUM(i.quantity) FROM "OrderItem" i JOIN "Order" o ON o.id = i."orderId"
        WHERE i."productId" = page.id AND o.status <> 'CANCELED'),0) AS sold FROM page ORDER BY page.position`);
  const total = rows.length ? Number(rows[0].total) : Number((await prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT COUNT(*) AS total ${from}`))[0]?.total ?? 0);
  const products = rows.length ? await prisma.product.findMany({ where: { id: { in: rows.map((row) => row.id) } }, include: productListInclude }) : [];
  const byId = new Map(products.map((product) => [product.id, product]));
  return { products: rows.flatMap((row) => { const product = byId.get(row.id); return product ? [mapProductCard({ ...product, soldCount: Number(row.sold) })] : []; }), total, page, pageCount: Math.max(1, Math.ceil(total / limit)) };
}

async function getProductList(filters: CatalogProductFilters = {}) {
  return (await getProductPage(filters)).products;
}

export async function getActiveCategories() {
  const categories = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    include: categoryInclude,
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }]
  });
  return categories.map(mapCategory);
}

export async function getCategoryBySlug(slug: string) {
  const virtualCategory = getVirtualCategory(slug);
  if (virtualCategory) return virtualCategory;

  const category = await prisma.category.findFirst({
    where: { slug, isActive: true },
    include: categoryInclude
  });
  return category ? mapCategory(category) : null;
}

export async function getProductsByCategorySlug(slug: string, filters: CatalogProductFilters = {}): Promise<CategoryProductsResult | null> {
  const [category, categories] = await Promise.all([
    getCategoryBySlug(slug),
    getActiveCategories()
  ]);

  if (!category) return null;

  const effectiveFilters = { ...filters, categorySlug: slug };
  const result = await getProductPage(effectiveFilters);

  return {
    category,
    categories,
    ...result,
    filters: effectiveFilters
  };
}

export const getProductBySlug = cache(async (slug: string) => {
  const product = await prisma.product.findFirst({
    where: { slug, deletedAt: null, status: 'ACTIVE', category: { isActive: true } },
    include: productListInclude
  });

  if (!product) return null;
  const [productWithSoldCount] = await withEffectiveSoldCounts([product]);
  return mapProductDetail(productWithSoldCount);
});

export async function getRelatedProducts(productId: string, categoryId: string) {
  const products = await prisma.product.findMany({
    where: {
      id: { not: productId },
      categoryId,
      deletedAt: null, status: 'ACTIVE',
      category: { isActive: true }
    },
    include: productListInclude,
    orderBy: [{ isBestSeller: 'desc' }, { soldCount: 'desc' }, { createdAt: 'desc' }],
    take: 5
  });
  const productsWithSoldCounts = await withEffectiveSoldCounts(products);
  return productsWithSoldCounts.map(mapProductCard);
}

export async function getFeaturedProducts(limit = 10) {
  const products = await prisma.product.findMany({
    where: { ...activeProductWhere(), isFeatured: true },
    include: productListInclude,
    orderBy: [{ soldCount: 'desc' }, { createdAt: 'desc' }],
    take: limit
  });
  const productsWithSoldCounts = await withEffectiveSoldCounts(products);
  return productsWithSoldCounts.map(mapProductCard);
}

export async function getNewArrivals(limit = 8) {
  const products = await prisma.product.findMany({
    where: { ...activeProductWhere(), isNewArrival: true },
    include: productListInclude,
    orderBy: [{ createdAt: 'desc' }],
    take: limit
  });
  const productsWithSoldCounts = await withEffectiveSoldCounts(products);
  return productsWithSoldCounts.map(mapProductCard);
}

export async function getBestSellers(limit = 5) {
  return (await getProductList({ sort: 'best-sellers', availability: 'in-stock', limit })).filter((product) => product.soldCount > 0);
}

export async function searchProducts(query: string, filters: CatalogProductFilters = {}) {
  return getProductList({ ...filters, q: query });
}

export async function getActiveBanners(placement: BannerPlacement) {
  const now = new Date();
  const banners = await prisma.banner.findMany({
    where: {
      placement,
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] }
      ]
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    take: 4
  });
  return banners.map(mapBanner);
}

export async function getHomeCatalog(): Promise<HomeCatalogResult> {
  const [categories, heroBanners, promoBanners, featuredProducts, newArrivals, bestSellers, todayOffers] = await Promise.all([
    getActiveCategories(),
    getActiveBanners('HOME_HERO'),
    getActiveBanners('HOME_PROMO'),
    getFeaturedProducts(5),
    getNewArrivals(5),
    getBestSellers(5),
    getProductList({ categorySlug: 'sale', limit: 5, sort: 'best-sellers' })
  ]);

  return {
    categories,
    heroBanners,
    promoBanners,
    featuredProducts,
    newArrivals,
    bestSellers,
    todayOffers
  };
}
