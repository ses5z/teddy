import type { Language } from '@teddy/shared';

export type Remaining =
  | { kind: 'overdue' }
  | { kind: 'days'; days: number; hours: number }
  | { kind: 'hours'; hours: number }
  | { kind: 'minutes'; minutes: number };

/** Time left until an ISO timestamp, split for the countdown labels. */
export function remaining(iso: string, now = Date.now()): Remaining {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return { kind: 'overdue' };
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return { kind: 'minutes', minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { kind: 'hours', hours };
  return { kind: 'days', days: Math.floor(hours / 24), hours: hours % 24 };
}

/** Whole days from today to a YYYY-MM-DD date. */
export function daysUntil(iso: string, from = new Date()): number {
  const [year, month, day] = iso.split('-').map(Number);
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.round((new Date(year, month - 1, day).getTime() - today.getTime()) / 86_400_000);
}

/** Formats a YYYY-MM-DD date without timezone shifts. */
export function formatDate(iso: string, language: Language): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    weekday: 'short',
  }).format(new Date(year, month - 1, day));
}
