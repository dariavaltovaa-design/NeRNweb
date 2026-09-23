// Dates as 'YYYY-MM-DD' strings in the device's time zone. Day arithmetic goes through UTC
// so daylight-saving changes never make a day 23 or 25 hours long.

export function localDateOf(timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toUtc(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(date: string, days: number): string {
  const d = new Date(toUtc(date) + days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** Whole days from a to b (b later → positive). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/** Noon of that local day — safe for Intl date formatting. */
export function dateFromLocal(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12);
}
