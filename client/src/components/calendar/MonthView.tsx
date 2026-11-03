import { useEffect, useRef, type KeyboardEvent } from 'react';
import type { CalendarApiEntry, CalendarEntryType } from '@teddy/shared';
import { useSettings } from '../../context/SettingsContext';
import { addDays, shiftMonth, formatLong, formatMonth, monthOf, monthWeeks, weekdayNames } from './dates';
import { EntryRow } from './ListView';
import { TYPE_META, ALL_TYPES, typeKey } from './types';

interface Props {
  month: string;
  entries: CalendarApiEntry[];
  today: string;
  /** Selected day from the URL, if any. */
  selected: string | null;
  onSelect: (day: string) => void;
}

const eventsOn = (entries: CalendarApiEntry[], day: string) => entries.filter((e) => e.start <= day && day <= e.end);

export function MonthView({ month, entries, today, selected, onSelect }: Props) {
  const { settings, t: c } = useSettings();
  const lang = settings.language;
  const weeks = monthWeeks(month);
  const focusDay =
    selected && monthOf(selected) === month ? selected : monthOf(today) === month ? today : `${month}-01`;
  const gridRef = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    gridRef.current?.querySelector<HTMLElement>(`[data-day="${focusDay}"]`)?.focus();
  }, [focusDay, month]);

  const onKey = (event: KeyboardEvent, day: string) => {
    const step: Record<string, string> = {
      ArrowLeft: addDays(day, -1),
      ArrowRight: addDays(day, 1),
      ArrowUp: addDays(day, -7),
      ArrowDown: addDays(day, 7),
      Home: addDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7)),
      End: addDays(day, 6 - ((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7)),
      PageUp: shiftMonth(day, -1),
      PageDown: shiftMonth(day, 1),
    };
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(day);
    } else if (step[event.key]) {
      event.preventDefault();
      const next = step[event.key];
      moveFocus.current = true;
      onSelect(next);
    }
  };

  const long = weekdayNames(lang, 'long');
  const short = weekdayNames(lang, 'short');
  const dayEntries = selected && monthOf(selected) === month ? eventsOn(entries, selected) : [];
  const inMonth = entries.some((e) => e.start <= `${month}-31` && e.end >= `${month}-01`);

  return (
    <div>
      <div
        ref={gridRef}
        role="grid"
        aria-label={c('calendar.gridLabel', { month: formatMonth(month, lang) })}
        className="border-l border-t border-border"
      >
        <div role="row" className="grid grid-cols-7">
          {long.map((name, i) => (
            <div
              key={name}
              role="columnheader"
              aria-label={name}
              className="border-b border-r border-border bg-tint px-1 py-1 text-center font-bold"
            >
              <span aria-hidden="true">{short[i]}</span>
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} role="row" className="grid grid-cols-7">
            {week.map((day, di) => {
              if (!day) return <div key={di} role="gridcell" aria-hidden="true" className="min-h-16 border-b border-r border-border bg-tint/40 sm:min-h-24" />;
              const list = eventsOn(entries, day);
              const types = ALL_TYPES.filter((t: CalendarEntryType) => list.some((e) => e.type === t));
              const isToday = day === today;
              const isSelected = day === selected;
              return (
                <div
                  key={day}
                  role="gridcell"
                  data-day={day}
                  tabIndex={day === focusDay ? 0 : -1}
                  aria-selected={isSelected}
                  aria-current={isToday ? 'date' : undefined}
                  aria-label={`${c('calendar.cellLabel', { date: formatLong(day, lang), count: list.length })}${types.length ? `: ${types.map((type) => c(typeKey(type))).join(', ')}` : ''}${isToday ? `, ${c('calendar.todayMark')}` : ''}`}
                  onClick={() => onSelect(day)}
                  onKeyDown={(e) => onKey(e, day)}
                  className={`flex min-h-16 min-w-0 cursor-pointer flex-col gap-1 overflow-hidden border-b border-r border-border p-1 sm:min-h-24 sm:p-2 ${isSelected ? 'bg-tint outline outline-2 -outline-offset-2 outline-primary' : 'hover:bg-tint/60'}`}
                >
                  <span
                    aria-hidden="true"
                    className={`inline-flex h-7 min-w-7 items-center justify-center self-start rounded px-1 font-semibold ${isToday ? 'border-2 border-primary bg-primary text-on-primary' : ''}`}
                  >
                    {Number(day.slice(8))}
                  </span>
                  <span aria-hidden="true" className="flex flex-wrap gap-0.5">
                    {types.map((t) => {
                      const { icon: Icon, color } = TYPE_META[t];
                      return <Icon key={t} size={16} className={color} />;
                    })}
                  </span>
                  {list.length > 0 && (
                    <span aria-hidden="true" className="hidden truncate font-semibold sm:block">
                      {list[0].name}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {!inMonth && <p className="mt-3">{c('calendar.emptyMonth')}</p>}

      {selected && monthOf(selected) === month && (
        <section aria-live="polite" className="mt-4">
          <h2 className="border-b-2 border-border pb-1 text-xl font-bold">
            {c('calendar.dayEvents', { date: formatLong(selected, lang) })}
          </h2>
          {dayEntries.length === 0 ? (
            <p className="mt-2">{c('calendar.dayEmpty')}</p>
          ) : (
            <ul>
              {dayEntries.map((e) => (
                <EntryRow key={e.id} entry={e} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
