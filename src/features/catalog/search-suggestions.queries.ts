import 'server-only';
import { prisma } from '@/lib/prisma';
import { normalizeSuggestionQuery, SEARCH_SUGGESTION_LIMIT, type SearchSuggestion } from './search-suggestions';
import { FALLBACK_PRODUCT_IMAGE } from './catalog.utils';

export async function getSearchSuggestions(input: string): Promise<SearchSuggestion[]> {
  const query = normalizeSuggestionQuery(input);
  if (query.length < 2) return [];
  const pattern = `%${query.replace(/[\\%_]/g, character => `\\${character}`)}%`;
  const rows = await prisma.$queryRaw<(Omit<SearchSuggestion, 'price'> & { price: unknown })[]>`
    WITH candidates AS (
      SELECT p.id, p.slug, p.name, p."basePrice", p."createdAt" FROM "Product" p
      JOIN "Category" c ON c.id = p."categoryId"
      WHERE p."deletedAt" IS NULL AND p.status = 'ACTIVE' AND c."isActive" = true
        AND (p.name ILIKE ${pattern} OR p.subtitle ILIKE ${pattern} OR p.description ILIKE ${pattern}
          OR p.brand ILIKE ${pattern} OR ${query} = ANY(p.tags))
      ORDER BY p."createdAt" DESC, p.id ASC LIMIT ${SEARCH_SUGGESTION_LIMIT}
    )
    SELECT p.id, p.slug, p.name, COALESCE(i.url, ${FALLBACK_PRODUCT_IMAGE}) AS image,
      COALESCE(v.price, p."basePrice") AS price, COALESCE(v.available, false) AS available
    FROM candidates p
    LEFT JOIN LATERAL (SELECT COALESCE(MIN(price) FILTER (WHERE quantity > 0), MIN(price)) AS price,
      BOOL_OR(quantity > 0) AS available FROM "ProductVariant" WHERE "productId" = p.id AND "isActive" = true) v ON true
    LEFT JOIN LATERAL (SELECT url FROM "ProductImage" WHERE "productId" = p.id ORDER BY "isPrimary" DESC, "sortOrder" ASC, id ASC LIMIT 1) i ON true
    ORDER BY p."createdAt" DESC, p.id ASC`;
  return rows.map(row => ({ ...row, price: Number(row.price) }));
}
