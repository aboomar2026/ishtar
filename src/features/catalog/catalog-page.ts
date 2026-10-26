import { cache } from 'react';
import { normalizeCatalogFilters } from './catalog.filters';
import { getProductsByCategorySlug } from './catalog.queries';

export type CategorySearchParams = Record<string, string | string[] | undefined>;
export const getCategoryPage = cache(async (slug: string, serializedParams: string) =>
  getProductsByCategorySlug(slug, normalizeCatalogFilters(JSON.parse(serializedParams))));
