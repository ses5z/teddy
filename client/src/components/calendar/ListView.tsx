import type { TKey } from '../../i18n';
import { useState } from 'react';
import type { CalendarApiEntry } from '@teddy/shared';
import { Button } from '../Button';
import { useSettings } from '../../context/SettingsContext';
import { formatLong, formatMonth, monthOf } from './dates';
import { TypeBadge, sourceLabelKey } from './types';

export function dateRange(entry: CalendarApiEntry, language: 'tr' | 'en', c: (key: TKey, params?: Record<string, string | number>) => string): string {
  return entry.start === entry.end
    ? formatLong(entry.start, language)
    : c('calendar.range', { start: formatLong(entry.start, language), end: formatLong(entry.end, language) });
}

export function EntryRow({ entry }: { entry: CalendarApiEntry }) {
  const { settings, t: c } = useSettings();
  return (
    <li className="flex flex-col gap-1 border-b border-border py-3 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="font-semibold sm:w-72 sm:shrink-0">{dateRange(entry, settings.language, c)}</span>
      <span className="min-w-0 flex-1 break-words">{entry.name}</span>
      <span className="flex flex-wrap items-baseline gap-x-3">
        <TypeBadge type={entry.type} />
        <span className="text-muted">{c(sourceLabelKey(entry))}</span>
      </span>
    </li>
  );
}

export function ListView({ entries, today, month }: { entries: CalendarApiEntry[]; today: string; month: string | null }) {
  const { settings, t: c } = useSettings();
  const [showPast, setShowPast] = useState(false);

  const sorted = [...entries].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
  const inMonth = month ? sorted.filter((e) => e.start <= `${month}-31` && e.end >= `${month}-01`) : sorted;
  const visible = month || showPast ? inMonth : sorted.filter((e) => e.end >= today);
  const hiddenCount = sorted.length - sorted.filter((e) => e.end >= today).length;

  const groups: { month: string; items: CalendarApiEntry[] }[] = [];
  for (const entry of visible) {
    const month = monthOf(entry.start);
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.items.push(entry);
    else groups.push({ month, items: [entry] });
  }

  return (
    <div>
      {!month && (hiddenCount > 0 || showPast) && (
        <Button variant="secondary" aria-pressed={showPast} onClick={() => setShowPast((v) => !v)} className="mb-3">
          {showPast ? c('calendar.hidePast') : c('calendar.showPast')}
        </Button>
      )}
      {groups.length === 0 ? (
        <p>{c(month ? 'calendar.emptyMonth' : 'calendar.emptyList')}</p>
      ) : (
        groups.map((group) => (
          <section key={group.month} className="mb-4">
            <h2 className="border-b-2 border-border pb-1 text-xl font-bold">
              {formatMonth(group.month, settings.language)}
            </h2>
            <ul>
              {group.items.map((entry) => (
                <EntryRow key={entry.id} entry={entry} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
