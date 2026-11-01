import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';

/** 'YYYY-MM' for the given local date. */
export function monthKey(date: Date = new Date()): string {
  return format(date, 'yyyy-MM');
}

/** First day of the month, local time. */
export function monthFromKey(key: string): Date {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, 1);
}

export function shiftMonth(key: string, delta: number): string {
  return monthKey(addMonths(monthFromKey(key), delta));
}

/** Inclusive ISO date range ('YYYY-MM-DD') covering the month. */
export function monthRange(key: string): { from: string; to: string } {
  const d = monthFromKey(key);
  return { from: toIsoDate(startOfMonth(d)), to: toIsoDate(endOfMonth(d)) };
}

export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Local-time Date for 'YYYY-MM-DD' (avoids the UTC shift of new Date(iso)). */
export function fromIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isIsoDate(text: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  return toIsoDate(fromIsoDate(text)) === text;
}

export function formatMonth(key: string): string {
  return format(monthFromKey(key), 'MMMM yyyy');
}

export function formatDay(iso: string): string {
  return format(fromIsoDate(iso), 'd MMM yyyy');
}
