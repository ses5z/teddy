import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { CalendarEntryType, CalendarResponse } from '@teddy/shared';
import { Button } from '../components/Button';
import { Skeleton } from '../components/Skeleton';
import { ListView } from '../components/calendar/ListView';
import { MonthView } from '../components/calendar/MonthView';
import { addMonths, formatMonth, formatStamp, isDay, isMonth, monthOf, todayIso } from '../components/calendar/dates';
import { ALL_TYPES, HOLIDAY_TYPES, TYPE_META, typeKey } from '../components/calendar/types';
import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';

type Status = 'loading' | 'error' | 'ready';

export function CalendarPage() {
  const { t, settings } = useSettings();
  const c = t;
  const lang = settings.language;
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<CalendarResponse | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    api
      .calendar(lang)
      .then((res) => {
        if (!alive) return;
        setData(res);
        setStatus('ready');
      })
      .catch(() => alive && setStatus('error'));
    return () => {
      alive = false;
    };
  }, [lang, attempt]);

  const today = todayIso();
  const view = params.get('view') === 'month' ? 'month' : 'list';
  const types = (params.get('types') ?? '')
    .split(',')
    .filter((x): x is CalendarEntryType => (ALL_TYPES as string[]).includes(x));
  const monthParam = params.get('month');
  const month = isMonth(monthParam) ? monthParam : monthOf(today);
  const dayParam = params.get('day');
  const selected = isDay(dayParam) ? dayParam : null;

  const setParams = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params);
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      navigate({ search: next.toString().replace(/%2C/g, ',') }, { replace: true });
    },
    [params, navigate],
  );

  const setTypes = (list: CalendarEntryType[]) =>
    setParams({ types: ALL_TYPES.filter((x) => list.includes(x)).join(',') });
  const toggleType = (type: CalendarEntryType) =>
    setTypes(types.includes(type) ? types.filter((x) => x !== type) : [...types, type]);
  const onlyHolidays = types.length === HOLIDAY_TYPES.length && HOLIDAY_TYPES.every((x) => types.includes(x));

  const entries = useMemo(
    () => (data?.entries ?? []).filter((e) => types.length === 0 || types.includes(e.type)),
    // types compared by joined value
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, types.join()],
  );

  const goMonth = (target: string) => setParams({ month: target, day: '' });
  const selectDay = (day: string) => setParams({ day, month: monthOf(day) });

  const heading = <h1 className="mb-3 text-3xl font-bold">{t('calendar.title')}</h1>;

  if (status === 'loading') {
    return (
      <>
        {heading}
        <Skeleton lines={8} label={c('calendar.loading')} />
      </>
    );
  }
  if (status === 'error' || !data) {
    return (
      <>
        {heading}
        <p role="alert" className="mb-3 font-semibold">
          {c('calendar.error')}
        </p>
        <Button onClick={() => setAttempt((n) => n + 1)}>{t('common.retry')}</Button>
      </>
    );
  }

  return (
    <>
      {heading}

      <div className="flex flex-col gap-3 border-y border-border py-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={c('calendar.viewLabel')}>
          {(['list', 'month'] as const).map((v) => (
            <Button
              key={v}
              variant={view === v ? 'primary' : 'secondary'}
              aria-pressed={view === v}
              onClick={() => setParams({ view: v === 'month' ? 'month' : '' })}
            >
              {c(v === 'list' ? 'calendar.viewList' : 'calendar.viewMonth')}
            </Button>
          ))}
          <Button
            variant={onlyHolidays ? 'primary' : 'secondary'}
            aria-pressed={onlyHolidays}
            onClick={() => setTypes(onlyHolidays ? [] : HOLIDAY_TYPES)}
          >
            {c('calendar.onlyHolidays')}
          </Button>
        </div>

        <fieldset>
          <legend className="font-bold">{c('calendar.filterTypes')}</legend>
          <div className="flex flex-wrap gap-x-4">
            {ALL_TYPES.map((type) => {
              const { icon: Icon, color } = TYPE_META[type];
              return (
                <label key={type} className="flex min-h-11 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 cursor-pointer accent-primary"
                    checked={types.includes(type)}
                    onChange={() => toggleType(type)}
                  />
                  <Icon aria-hidden="true" size={18} className={color} />
                  {c(typeKey(type))}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" aria-label={c('calendar.prev')} onClick={() => goMonth(addMonths(month, -1))}>
              <ChevronLeft aria-hidden="true" size={20} />
            </Button>
            <h2 aria-live="polite" className="min-w-40 text-center text-xl font-bold">
              {formatMonth(month, lang)}
            </h2>
            <Button variant="secondary" aria-label={c('calendar.next')} onClick={() => goMonth(addMonths(month, 1))}>
              <ChevronRight aria-hidden="true" size={20} />
            </Button>
            <Button variant="secondary" onClick={() => setParams(view === 'month' ? { month: '', day: '' } : { month: monthOf(today), day: '' })}>
              {c('calendar.today')}
            </Button>
        </div>
      </div>

      <div className="my-4">
        {view === 'month' ? (
          <MonthView month={month} entries={entries} today={today} selected={selected} onSelect={selectDay} />
        ) : (
          <ListView entries={entries} today={today} month={isMonth(monthParam) ? month : null} />
        )}
      </div>

      <p className="border-t border-border pt-3 text-muted">
        {c('calendar.source', { date: formatStamp(data.lastFetchedAt, lang) })}
        {' · '}
        <a
          href={data.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-semibold text-primary underline"
        >
          {c('calendar.sourceLink')}
          <ExternalLink aria-hidden="true" size={16} />
        </a>
      </p>
    </>
  );
}
