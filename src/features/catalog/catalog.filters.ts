import type { CatalogAvailability, CatalogProductFilters, CatalogProductSort } from './catalog.types';
import { normalizeSearchQuery, parseNumberFilter } from './catalog.utils';

const sorts: CatalogProductSort[] = ['newest', 'price-asc', 'price-desc', 'best-sellers'];
const availabilityOptions: CatalogAvailability[] = ['in-stock', 'all'];

type SearchParamValue = string | string[] | undefined;

export function normalizeCatalogFilters(searchParams?: Record<string, SearchParamValue>): CatalogProductFilters {
  const q = normalizeSearchQuery(Array.isArray(searchParams?.q) ? searchParams?.q[0] : searchParams?.q);
  const rawSort = Array.isArray(searchParams?.sort) ? searchParams?.sort[0] : searchParams?.sort;
  const rawAvailability = Array.isArray(searchParams?.availability) ? searchParams?.availability[0] : searchParams?.availability;
  const sort = sorts.includes(rawSort as CatalogProductSort) ? rawSort as CatalogProductSort : 'newest';
  const availability = availabilityOptions.includes(rawAvailability as CatalogAvailability)
    ? rawAvailability as CatalogAvailability
    : 'all';

  return {
    q,
    sort,
    availability,
    minPrice: parseNumberFilter(searchParams?.minPrice),
    maxPrice: parseNumberFilter(searchParams?.maxPrice)
  };
}
