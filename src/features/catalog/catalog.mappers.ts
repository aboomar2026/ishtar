import type { Prisma } from '@prisma/client';
import type {
  CatalogBanner,
  CatalogCategory,
  CatalogProduct,
  CatalogProductImage,
  CatalogProductVariant
} from './catalog.types';
import { CURRENCY, FALLBACK_PRODUCT_IMAGE, getDiscountPercent, getStockState } from './catalog.utils';

type DecimalLike = Prisma.Decimal | number | string | null | undefined;

type CategoryWithCount = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  parentId?: string | null;
  _count?: { products?: number };
};

type ProductImageLike = {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

type ProductVariantLike = {
  id: string;
  productId: string;
  sku: string;
  colorName: string | null;
  colorValue: string | null;
  size: string | null;
  price: DecimalLike;
  compareAtPrice: DecimalLike;
  quantity: number;
  lowStockThreshold: number;
  isActive: boolean;
};

type ProductLike = {
  id: string;
  categoryId: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string;
  details: Prisma.JsonValue | null;
  careInstructions: string | null;
  brand: string | null;
  basePrice: DecimalLike;
  compareAtPrice: DecimalLike;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  rating: DecimalLike;
  reviewCount: number;
  soldCount: number;
  viewCount: number;
  tags: string[];
  images: ProductImageLike[];
  variants: ProductVariantLike[];
  category?: CategoryWithCount | null;
};

type BannerLike = {
  id: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  imageUrl: string | null;
  href: string | null;
  ctaLabel: string | null;
  placement: CatalogBanner['placement'];
};

function decimalToNumber(value: DecimalLike): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return value.toNumber();
}

function mapOptional(value?: string | null) {
  return value || undefined;
}

function mapDetails(value: Prisma.JsonValue | null): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  if (typeof value === 'string') return [value];
  return [];
}

export function mapCategory(category: CategoryWithCount): CatalogCategory {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: mapOptional(category.description),
    imageUrl: mapOptional(category.imageUrl),
    parentId: mapOptional(category.parentId),
    productCount: category._count?.products ?? undefined
  };
}

export function mapVariant(variant: ProductVariantLike): CatalogProductVariant {
  return {
    id: variant.id,
    productId: variant.productId,
    sku: variant.sku,
    colorName: mapOptional(variant.colorName),
    colorValue: mapOptional(variant.colorValue),
    size: mapOptional(variant.size),
    price: decimalToNumber(variant.price) ?? 0,
    compareAtPrice: decimalToNumber(variant.compareAtPrice),
    quantity: variant.quantity,
    lowStockThreshold: variant.lowStockThreshold,
    isActive: variant.isActive
  };
}

function mapImage(image: ProductImageLike): CatalogProductImage {
  return {
    id: image.id,
    url: image.url,
    alt: mapOptional(image.alt),
    sortOrder: image.sortOrder,
    isPrimary: image.isPrimary
  };
}

export function mapProductCard(product: ProductLike): CatalogProduct {
  return mapProduct(product);
}

export function mapProductDetail(product: ProductLike): CatalogProduct {
  return mapProduct(product);
}

function mapProduct(product: ProductLike): CatalogProduct {
  const variants = product.variants.filter((variant) => variant.isActive).map(mapVariant);
  const sortedImages = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder).map(mapImage);
  const activeVariantPrices = variants.length ? variants.map((variant) => variant.price) : [decimalToNumber(product.basePrice) ?? 0];
  const price = Math.min(...activeVariantPrices);
  const baseCompareAtPrice = decimalToNumber(product.compareAtPrice);
  const variantCompareAtPrice = variants
    .map((variant) => variant.compareAtPrice)
    .filter((value): value is number => typeof value === 'number' && value > price)
    .sort((a, b) => a - b)[0];
  const compareAtPrice = variantCompareAtPrice ?? baseCompareAtPrice;
  const totalStock = variants.reduce((sum, variant) => sum + Math.max(0, variant.quantity), 0);
  const lowestThreshold = variants.length
    ? Math.min(...variants.map((variant) => variant.lowStockThreshold))
    : 0;
  const stockState = getStockState(totalStock, lowestThreshold);
  const image = sortedImages.find((item) => item.isPrimary)?.url ?? sortedImages[0]?.url ?? FALLBACK_PRODUCT_IMAGE;

  return {
    id: product.id,
    categoryId: product.categoryId,
    category: product.category ? mapCategory(product.category) : undefined,
    slug: product.slug,
    name: product.name,
    subtitle: mapOptional(product.subtitle),
    description: product.description,
    details: mapDetails(product.details),
    careInstructions: mapOptional(product.careInstructions),
    brand: mapOptional(product.brand),
    basePrice: decimalToNumber(product.basePrice) ?? price,
    price,
    compareAtPrice,
    currency: CURRENCY,
    rating: decimalToNumber(product.rating),
    reviewCount: product.reviewCount,
    soldCount: product.soldCount,
    viewCount: product.viewCount,
    tags: product.tags,
    isFeatured: product.isFeatured,
    isNewArrival: product.isNewArrival,
    isBestSeller: product.isBestSeller,
    images: sortedImages,
    image,
    variants,
    totalStock,
    stockState,
    isOutOfStock: stockState === 'out-of-stock',
    discountPercent: getDiscountPercent(price, compareAtPrice)
  };
}

export function mapBanner(banner: BannerLike): CatalogBanner {
  return {
    id: banner.id,
    title: banner.title,
    subtitle: mapOptional(banner.subtitle),
    eyebrow: mapOptional(banner.eyebrow),
    imageUrl: mapOptional(banner.imageUrl),
    href: mapOptional(banner.href),
    ctaLabel: mapOptional(banner.ctaLabel),
    placement: banner.placement
  };
}
