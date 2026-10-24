import { getSearchSuggestions } from '@/features/catalog/search-suggestions.queries';
import { SEARCH_QUERY_LIMIT } from '@/features/catalog/search-suggestions';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('q') ?? '';
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
  if (query.length > SEARCH_QUERY_LIMIT) return Response.json({ products: [] }, { status: 400, headers });
  try { return Response.json({ products: await getSearchSuggestions(query) }, { headers }); }
  catch { return Response.json({ products: [], error: 'SEARCH_UNAVAILABLE' }, { status: 503, headers }); }
}
