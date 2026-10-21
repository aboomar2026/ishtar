import type { Prisma, BannerPlacement } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { CatalogProductFilters, CategoryProductsResult, HomeCatalogResult } from './catalog.types';
import { mapBanner, mapCategory, mapProductCard, mapProductDetail } from './catalog.mappers';
import { getVirtualCategory } from './catalog.utils';

const productListInclude = {
  category: true,
  images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
  variants: { where: { isActive: true }, orderBy: [{ colorName: 'asc' }, { size: 'asc' }] }
} satisfies Prisma.ProductInclude;

const categoryInclude = {
  _count: {
    select: {
      products: { where: { status: 'ACTIVE' } }
    }
  }
} satisfies Prisma.CategoryInclude;

function activeProductWhere(filters: CatalogProductFilters = {}): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    status: 'ACTIVE',
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
    } else {
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

function productOrderBy(sort: CatalogProductFilters['sort']): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case 'price-asc':
      return [{ basePrice: 'asc' }, { createdAt: 'desc' }];
    case 'price-desc':
      return [{ basePrice: 'desc' }, { createdAt: 'desc' }];
    case 'best-sellers':
      return [{ soldCount: 'desc' }, { createdAt: 'desc' }];
    case 'newest':
    default:
      return [{ createdAt: 'desc' }];
  }
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
    soldCount: Math.max(product.soldCount, soldCountByProduct.get(product.id) ?? 0)
  }));
}

function sortByEffectiveBestSellers<T extends { soldCount: number; createdAt: Date }>(products: T[]): T[] {
  return [...products].sort((a, b) => b.soldCount - a.soldCount || b.createdAt.getTime() - a.createdAt.getTime());
}

async function getProductList(filters: CatalogProductFilters = {}) {
  const products = await prisma.product.findMany({
    where: activeProductWhere(filters),
    include: productListInclude,
    orderBy: productOrderBy(filters.sort),
    take: filters.limit ?? 24
  });
  const productsWithSoldCounts = await withEffectiveSoldCounts(products);
  const sortedProducts = filters.sort === 'best-sellers' ? sortByEffectiveBestSellers(productsWithSoldCounts) : productsWithSoldCounts;
  return sortedProducts.map(mapProductCard);
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
  const products = await getProductList(effectiveFilters);

  return {
    category,
    categories,
    products,
    total: products.length,
    filters: effectiveFilters
  };
}

export async function getProductBySlug(slug: string) {
  const product = await prisma.product.findFirst({
    where: { slug, status: 'ACTIVE', category: { isActive: true } },
    include: productListInclude
  });

  if (!product) return null;
  const [productWithSoldCount] = await withEffectiveSoldCounts([product]);
  return mapProductDetail(productWithSoldCount);
}

export async function getRelatedProducts(productId: string, categoryId: string) {
  const products = await prisma.product.findMany({
    where: {
      id: { not: productId },
      categoryId,
      status: 'ACTIVE',
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

export async function getBestSellers(limit = 8) {
  const products = await prisma.product.findMany({
    where: { ...activeProductWhere(), isBestSeller: true },
    include: productListInclude,
    orderBy: [{ soldCount: 'desc' }, { createdAt: 'desc' }],
    take: limit
  });
  const productsWithSoldCounts = await withEffectiveSoldCounts(products);
  return sortByEffectiveBestSellers(productsWithSoldCounts).map(mapProductCard);
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
    getFeaturedProducts(10),
    getNewArrivals(8),
    getBestSellers(8),
    getProductList({ categorySlug: 'sale', limit: 8, sort: 'best-sellers' })
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
