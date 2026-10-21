import { type NextRequest } from 'next/server';
import { brand } from '@/lib/brand';
import type { OrderStatus } from '@prisma/client';
import { getAdminSession } from '@/features/admin/auth/admin-auth';
import { getOrdersForExport, type AdminOrderDateFilter, type AdminDeliveryFeeFilter } from '@/features/admin/orders/order-admin.queries';
import { buildOrdersCsv } from '@/features/admin/orders/order-csv';

export const dynamic = 'force-dynamic';

/** GET /admin/orders/export — protected CSV download honouring the list filters. */
export async function GET(request: NextRequest) {
  // Route handlers are not wrapped by the protected layout, so guard here.
  const session = await getAdminSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rows = await getOrdersForExport({
    q: searchParams.get('q') ?? undefined,
    status: (searchParams.get('status') as OrderStatus | 'ALL') ?? 'ALL',
    date: (searchParams.get('date') as AdminOrderDateFilter) ?? 'all',
    delivery: (searchParams.get('delivery') as AdminDeliveryFeeFilter | null) ?? 'ALL'
  });

  const csv = buildOrdersCsv(rows);
  const filename = `${brand.key}-orders-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store'
    }
  });
}
