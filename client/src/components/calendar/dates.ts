import type { Language } from '@teddy/shared';

const TZ = 'Europe/Istanbul';
const locale = (language: Language) => (language === 'tr' ? 'tr-TR' : 'en-GB');
const pad = (n: number) => String(n).padStart(2, '0');

/** Today as YYYY-MM-DD in Istanbul. */
export function todayIso(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
}

export function addDays(iso: string, n: number): string {
  const [y, m, d] = parts(iso);
  const date = new Date(Date.UTC(y, m - 1, d + n));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export const monthOf = (iso: string) => iso.slice(0, 7);

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

export const isMonth = (value: string | null): value is string => !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
export const isDay = (value: string | null): value is string =>
  !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && addDays(value, 0) === value;

/** Weeks of a month, Monday first; null pads the days outside it. */
export function monthWeeks(month: string): (string | null)[][] {
  const [y, m] = month.split('-').map(Number);
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: total }, (_, i) => `${month}-${pad(i + 1)}`),
  ];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

function utcFormat(iso: string, language: Language, options: Intl.DateTimeFormatOptions): string {
  const [y, m, d] = parts(iso.length === 7 ? `${iso}-01` : iso);
  return new Intl.DateTimeFormat(locale(language), { timeZone: 'UTC', ...options }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "29 Ekim 2026" / "29 October 2026". */
export const formatLong = (iso: string, language: Language) => utcFormat(iso, language, { dateStyle: 'long' });
export const formatMonth = (month: string, language: Language) =>
  utcFormat(month, language, { month: 'long', year: 'numeric' });
/** Weekday names, Monday first. 2024-01-01 is a Monday. */
export const weekdayNames = (language: Language, width: 'long' | 'short' | 'narrow') =>
  Array.from({ length: 7 }, (_, i) => utcFormat(addDays('2024-01-01', i), language, { weekday: width }));

export function formatStamp(stamp: string, language: Language): string {
  const date = new Date(stamp);
  if (Number.isNaN(date.getTime())) return stamp;
  return new Intl.DateTimeFormat(locale(language), { dateStyle: 'long', timeStyle: 'short', timeZone: TZ }).format(date);
}

/** Same day number in another month, clamped to that month's last day. */
export function shiftMonth(day: string, n: number): string {
  const target = addMonths(monthOf(day), n);
  const [y, m] = target.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${target}-${pad(Math.min(Number(day.slice(8)), last))}`;
}
