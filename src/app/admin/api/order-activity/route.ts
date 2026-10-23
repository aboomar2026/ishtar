import { getAdminSession } from '@/features/admin/auth/admin-auth';
import { hasAdminPermission } from '@/features/admin/auth/admin-permissions';
import { getOrderActivity } from '@/features/notifications/notification.queries';

export const dynamic = 'force-dynamic';
export async function GET() {
  const session = await getAdminSession();
  const headers = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };
  if (!session) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401, headers });
  if (!hasAdminPermission(session.role, 'orders')) return Response.json({ error: 'FORBIDDEN' }, { status: 403, headers });
  try { return Response.json(await getOrderActivity(session.id), { headers }); }
  catch { return Response.json({ error: 'ACTIVITY_UNAVAILABLE' }, { status: 503, headers }); }
}
