export type ProductStockState = 'in-stock' | 'low-stock' | 'out-of-stock';

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
  productCount?: number;
  isVirtual?: boolean;
};

export type CatalogProductImage = {
  id: string;
  url: string;
  alt?: string;
  sortOrder: number;
  isPrimary: boolean;
};

export type CatalogProductVariant = {
  id: string;
  productId: string;
  sku: string;
  colorName?: string;
  colorValue?: string;
  size?: string;
  price: number;
  compareAtPrice?: number;
  quantity: number;
  lowStockThreshold: number;
  isActive: boolean;
};

export type CatalogProduct = {
  id: string;
  categoryId: string;
  category?: CatalogCategory;
  slug: string;
  name: string;
  subtitle?: string;
  description: string;
  details: string[];
  careInstructions?: string;
  brand?: string;
  basePrice: number;
  price: number;
  compareAtPrice?: number;
  currency: '₪';
  rating?: number;
  reviewCount: number;
  soldCount: number;
  viewCount: number;
  tags: string[];
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  images: CatalogProductImage[];
  image: string;
  variants: CatalogProductVariant[];
  totalStock: number;
  stockState: ProductStockState;
  isOutOfStock: boolean;
  discountPercent?: number;
};

export type CatalogBanner = {
  id: string;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  imageUrl?: string;
  href?: string;
  ctaLabel?: string;
  placement: 'HOME_HERO' | 'HOME_PROMO' | 'CATEGORY_TOP';
};

export type CatalogProductSort = 'newest' | 'price-asc' | 'price-desc' | 'best-sellers';
export type CatalogAvailability = 'in-stock' | 'all';

export type CatalogProductFilters = {
  q?: string;
  categorySlug?: string;
  sort?: CatalogProductSort;
  availability?: CatalogAvailability;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
};

export type CategoryProductsResult = {
  category: CatalogCategory;
  categories: CatalogCategory[];
  products: CatalogProduct[];
  total: number;
  filters: CatalogProductFilters;
};

export type HomeCatalogResult = {
  categories: CatalogCategory[];
  heroBanners: CatalogBanner[];
  promoBanners: CatalogBanner[];
  featuredProducts: CatalogProduct[];
  newArrivals: CatalogProduct[];
  bestSellers: CatalogProduct[];
  todayOffers: CatalogProduct[];
};
