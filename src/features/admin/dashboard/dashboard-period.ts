import { BUSINESS_TIME_ZONE } from '@/lib/business-time';

export const DASHBOARD_PERIODS = { today: 'اليوم', week: 'آخر 7 أيام', month: 'آخر 30 يومًا' } as const;
export type DashboardPeriod = keyof typeof DASHBOARD_PERIODS;
const dateFormatter = new Intl.DateTimeFormat('en-US', { timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

export function businessDateKey(date: Date): string {
  const parts = Object.fromEntries(dateFormatter.formatToParts(date).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function shiftDate(key: string, days: number): string {
  return new Date(Date.parse(`${key}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}

// Find the first instant of a local calendar date, including dates with a skipped midnight.
function startOfDate(key: string): Date {
  const noon = Date.parse(`${key}T12:00:00Z`);
  let low = noon - 36 * 3600000;
  let high = noon + 36 * 3600000;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (businessDateKey(new Date(mid)) < key) low = mid + 1;
    else high = mid;
  }
  return new Date(low);
}

export function dashboardPeriodRange(value?: string, now = new Date()) {
  const period: DashboardPeriod = value === 'week' || value === 'month' ? value : 'today';
  const days = period === 'week' ? 7 : period === 'month' ? 30 : 1;
  const today = businessDateKey(now);
  const keys = Array.from({ length: days }, (_, index) => shiftDate(today, index - days + 1));
  return { period, label: DASHBOARD_PERIODS[period], keys, start: startOfDate(keys[0]), end: startOfDate(shiftDate(today, 1)) };
}
