import { getWishlistProducts } from '@/features/wishlist/wishlist.queries';
import { WISHLIST_LIMIT, validProductId } from '@/features/wishlist/wishlist-storage';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
  let ids: string[];
  try {
    const raw = await request.text();
    if (raw.length > 12000) throw new Error('length');
    const body = JSON.parse(raw);
    if (!Array.isArray(body.ids) || body.ids.length > WISHLIST_LIMIT || !body.ids.every(validProductId)) throw new Error('ids');
    ids = body.ids;
  } catch { return Response.json({ error: 'INVALID_IDS' }, { status: 400, headers }); }
  try { return Response.json(await getWishlistProducts(ids), { headers }); }
  catch { return Response.json({ error: 'CATALOG_UNAVAILABLE' }, { status: 503, headers }); }
}
