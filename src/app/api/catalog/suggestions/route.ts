import { getCollections } from '@/features/collections/collections.queries';
import { getSearchSuggestions } from '@/features/catalog/search-suggestions.queries';
import { SEARCH_QUERY_LIMIT } from '@/features/catalog/search-suggestions';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q') ?? '';
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
  if (query.length > SEARCH_QUERY_LIMIT) return Response.json({ products: [] }, { status: 400, headers });
  try { const [products, collections] = await Promise.all([getSearchSuggestions(query), query.trim().length >= 2 ? getCollections({ q: query, limit: 2 }) : Promise.resolve([])]); return Response.json({ products, collections: collections.map(c => ({ id: c.id, name: c.name, slug: c.slug, image: c.imageUrl ?? c.images[0] ?? '/mock-products/gift-box.svg' })) }, { headers }); }
  catch { return Response.json({ products: [], error: 'SEARCH_UNAVAILABLE' }, { status: 503, headers }); }
}
