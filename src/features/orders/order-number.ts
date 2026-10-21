/** Order number helpers — format BAH-YYYYMMDD-0001 (daily zero-padded sequence). */

export function orderNumberDatePrefix(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `BAH-${year}${month}${day}`;
}

export function buildOrderNumber(date: Date, sequence: number): string {
  return `${orderNumberDatePrefix(date)}-${String(sequence).padStart(4, '0')}`;
}
