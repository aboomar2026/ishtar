import 'server-only';
import { prisma } from '@/lib/prisma';
import { BUSINESS_TIME_ZONE } from '@/lib/business-time';
import { dashboardPeriodRange } from './dashboard-period';

type Day = { day: string; orders: number; canceled: number; delivered: number; pendingDelivery: number; orderValue: number; deliveredValue: number };
type RawDay = Omit<Day, 'orderValue' | 'deliveredValue'> & { orderValue: unknown; deliveredValue: unknown };

export async function getDashboardAnalytics(value?: string, now = new Date()) {
  const range = dashboardPeriodRange(value, now);
  // Prisma timestamps are UTC stored as timestamp without time zone. Convert before grouping.
  const rows = await prisma.$queryRaw<RawDay[]>`
    SELECT to_char(timezone(${BUSINESS_TIME_ZONE}, "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS "day",
      COUNT(*)::int AS "orders",
      COUNT(*) FILTER (WHERE "status" = 'CANCELED')::int AS "canceled",
      COUNT(*) FILTER (WHERE "status" = 'DELIVERED')::int AS "delivered",
      COUNT(*) FILTER (WHERE "status" NOT IN ('CANCELED', 'DELIVERED') AND "deliveryFeeStatus" = 'PENDING')::int AS "pendingDelivery",
      COALESCE(SUM("total") FILTER (WHERE "status" <> 'CANCELED'), 0) AS "orderValue",
      COALESCE(SUM("total") FILTER (WHERE "status" = 'DELIVERED'), 0) AS "deliveredValue"
    FROM "Order" WHERE "createdAt" >= ${range.start} AND "createdAt" < ${range.end}
    GROUP BY 1 ORDER BY 1`;
  const byDay = new Map(rows.map(row => [row.day, row]));
  const daily: Day[] = range.keys.map(day => {
    const row = byDay.get(day);
    return { day, orders: row?.orders ?? 0, canceled: row?.canceled ?? 0, delivered: row?.delivered ?? 0,
      pendingDelivery: row?.pendingDelivery ?? 0, orderValue: Number(row?.orderValue ?? 0), deliveredValue: Number(row?.deliveredValue ?? 0) };
  });
  const totals = daily.reduce((sum, row) => ({ day: '', orders: sum.orders + row.orders, canceled: sum.canceled + row.canceled,
    delivered: sum.delivered + row.delivered, pendingDelivery: sum.pendingDelivery + row.pendingDelivery,
    orderValue: sum.orderValue + row.orderValue, deliveredValue: sum.deliveredValue + row.deliveredValue }),
    { day: '', orders: 0, canceled: 0, delivered: 0, pendingDelivery: 0, orderValue: 0, deliveredValue: 0 });
  return { period: range.period, label: range.label, daily, totals,
    averageOrderValue: totals.orders > totals.canceled ? totals.orderValue / (totals.orders - totals.canceled) : 0 };
}
