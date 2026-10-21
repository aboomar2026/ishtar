import { brand } from './brand';
export const showCatalogMetrics = brand.key !== 'ishtar' || process.env.NEXT_PUBLIC_SHOW_CATALOG_METRICS === 'true';
