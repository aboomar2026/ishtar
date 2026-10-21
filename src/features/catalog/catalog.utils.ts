import type { CatalogCategory, CatalogProduct, ProductStockState } from './catalog.types';
import { brand } from '@/lib/brand';

export const CURRENCY = '₪' as const;
export const FALLBACK_PRODUCT_IMAGE = '/mock-products/gift-box.svg';

export const virtualCategories: Record<string, CatalogCategory> = {
  'new-in': {
    id: 'virtual-new-in',
    name: 'وصل حديثاً',
    slug: 'new-in',
    description: brand.copy.virtualNewInDescription,
    imageUrl: '/mock-products/gift-box.svg',
    isVirtual: true
  },
  sale: {
    id: 'virtual-sale',
    name: 'عروض اليوم',
    slug: 'sale',
    description: 'خصومات مختارة لفترة محدودة مع الدفع عند الاستلام.',
    imageUrl: '/mock-products/perfume-gold.svg',
    isVirtual: true
  }
};

export function getVirtualCategory(slug: string) {
  return virtualCategories[slug];
}

export function getDiscountPercent(price: number, compareAtPrice?: number) {
  if (!compareAtPrice || compareAtPrice <= price) return undefined;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

export function getStockState(totalStock: number, lowStockThreshold: number): ProductStockState {
  if (totalStock <= 0) return 'out-of-stock';
  if (totalStock <= lowStockThreshold) return 'low-stock';
  return 'in-stock';
}

export function getProductPrimaryImage(product: Pick<CatalogProduct, 'images'>) {
  return product.images.find((image) => image.isPrimary)?.url ?? product.images[0]?.url ?? FALLBACK_PRODUCT_IMAGE;
}

export function normalizeSearchQuery(value?: string) {
  return value?.trim() || undefined;
}

export function parseNumberFilter(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}
