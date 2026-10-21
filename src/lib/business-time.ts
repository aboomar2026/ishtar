export const BUSINESS_TIME_ZONE = 'Asia/Hebron';

export function startOfBusinessDay(now = new Date()): Date {
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  function parts(date: Date) {
    const values = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
    return { year: Number(values.year), month: Number(values.month), day: Number(values.day), hour: Number(values.hour), minute: Number(values.minute), second: Number(values.second) };
  }
  const date = parts(now);
  const midnight = Date.UTC(date.year, date.month - 1, date.day);
  let candidate = midnight;
  for (let pass = 0; pass < 3; pass++) {
    const local = parts(new Date(candidate));
    candidate += midnight - Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
  }
  return new Date(candidate);
}
