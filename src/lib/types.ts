export type {
  CatalogBanner,
  CatalogCategory as Category,
  CatalogProduct as Product,
  CatalogProductImage,
  CatalogProductVariant,
  ProductStockState
} from '@/features/catalog/catalog.types';

export type CartLine = {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  image: string;
  selectedColorName?: string;
  selectedColorValue?: string;
  selectedSize?: string;
  quantity: number;
  unitPrice: number;
  compareAtPrice?: number;
  sku?: string;
};
