/**
 * Compatibility entry point for the active white-label store brand.
 * Add/edit brand profiles under src/config/brands and select one with:
 * NEXT_PUBLIC_STORE_BRAND=saad | bab-al-hara | obbeh | madar | ishtar
 */
export {
  activeBrandKey,
  availableBrands,
  brand,
  getBrandCssVariables
} from '@/config/brands';
export type {
  BrandAssets,
  BrandColors,
  BrandKey,
  BrandProfile
} from '@/config/brands';
