import { useMemo, useState } from 'react';
import type { Announcement, Importance } from '@teddy/shared';
import { IMPORTANCE_RANK } from '../components/ImportanceBadge';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnnouncementCard } from '../components/AnnouncementCard';
import { Button } from '../components/Button';
import { Skeleton } from '../components/Skeleton';
import { DataSourceBadge } from '../components/SourceTag';
import { useReadAnnouncements } from '../context/ReadAnnouncementsContext';
import { useSettings } from '../context/SettingsContext';
import type { TKey } from '../i18n';

const LEVELS: { id: Importance; label: TKey }[] = [
  { id: 'critical', label: 'importance.critical' },
  { id: 'important', label: 'importance.important' },
  { id: 'info', label: 'importance.info' },
];

const CHECKBOX_LABEL = 'flex min-h-11 cursor-pointer items-center gap-2';
const CHECKBOX = 'h-5 w-5 shrink-0 cursor-pointer accent-primary';

function listParam(params: URLSearchParams, key: string): string[] {
  return (params.get(key) ?? '').split(',').filter(Boolean);
}

function byDate(a: Announcement, b: Announcement): number {
  return b.postedAt.localeCompare(a.postedAt);
}

export function AnnouncementsScreen() {
  const { t } = useSettings();
  const { status, source, announcements, unreadCount, isRead, markRead, markAllRead, reload } = useReadAnnouncements();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // Cards read while "unread only" is on stay until the filter changes, so an opened card does not vanish.
  const [readHere, setReadHere] = useState<Set<string>>(() => new Set());

  const courses = listParam(searchParams, 'courses');
  const levels = listParam(searchParams, 'importance');
  const unreadOnly = searchParams.get('unread') === '1';
  const sortByDate = searchParams.get('sort') === 'date';

  const courseOptions = useMemo(() => {
    const codes = new Map(announcements.map((item) => [item.courseId, item.courseCode]));
    return [...codes].sort((a, b) => a[1].localeCompare(b[1]));
  }, [announcements]);

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    // Keeps the commas readable in the address bar.
    navigate({ search: next.toString().replace(/%2C/g, ',') }, { replace: true });
  };

  const toggleInList = (key: string, list: string[], value: string) =>
    setParam(key, (list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]).join(','));

  const setUnreadOnly = (checked: boolean) => {
    setReadHere(new Set());
    setParam('unread', checked ? '1' : '');
  };

  const onRead = (id: string) => {
    markRead(id);
    if (unreadOnly && !isRead(id)) setReadHere((prev) => new Set(prev).add(id));
  };

  const onMarkAll = () => {
    setReadHere(new Set());
    markAllRead();
  };

  const visible = useMemo(() => {
    const filtered = announcements.filter(
      (item) =>
        (courses.length === 0 || courses.includes(String(item.courseId))) &&
        (levels.length === 0 || levels.includes(item.importance)) &&
        (!unreadOnly || !isRead(item.id) || readHere.has(item.id)),
    );
    return filtered.sort(
      sortByDate ? byDate : (a, b) => IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance] || byDate(a, b),
    );
    // The list params are compared by value through their joined form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [announcements, courses.join(), levels.join(), unreadOnly, isRead, readHere, sortByDate]);

  const heading = (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-3xl font-bold">{t('announcementsPage.title')}</h1>
      {status === 'ready' && source && <DataSourceBadge source={source} />}
    </div>
  );

  if (status === 'loading') {
    return (
      <>
        {heading}
        <Skeleton lines={8} label={t('announcementsPage.loading')} />
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        {heading}
        <p role="alert" className="mb-3 font-semibold">
          {t('announcementsPage.error')}
        </p>
        <Button onClick={reload}>{t('common.retry')}</Button>
      </>
    );
  }

  if (announcements.length === 0) {
    return (
      <>
        {heading}
        <p>{t('announcementsPage.none')}</p>
      </>
    );
  }

  const unread = unreadCount ?? 0;

  return (
    <>
      {heading}

      <form onSubmit={(event) => event.preventDefault()} className="flex flex-col gap-3 border-y border-border py-3">
        <fieldset>
          <legend className="font-bold">{t('announcementsPage.filterCourse')}</legend>
          <div className="flex flex-wrap gap-x-4">
            {courseOptions.map(([id, code]) => (
              <label key={id} className={CHECKBOX_LABEL}>
                <input
                  type="checkbox"
                  className={CHECKBOX}
                  checked={courses.includes(String(id))}
                  onChange={() => toggleInList('courses', courses, String(id))}
                />
                {code}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-bold">{t('announcementsPage.filterImportance')}</legend>
          <div className="flex flex-wrap gap-x-4">
            {LEVELS.map(({ id, label }) => (
              <label key={id} className={CHECKBOX_LABEL}>
                <input
                  type="checkbox"
                  className={CHECKBOX}
                  checked={levels.includes(id)}
                  onChange={() => toggleInList('importance', levels, id)}
                />
                {t(label)}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <label className={CHECKBOX_LABEL}>
            <input
              type="checkbox"
              className={CHECKBOX}
              checked={unreadOnly}
              onChange={(event) => setUnreadOnly(event.target.checked)}
            />
            {t('announcementsPage.unreadOnly')}
          </label>
          <label className="flex flex-wrap items-center gap-2">
            <span className="font-bold">{t('announcementsPage.sort')}</span>
            <select
              value={sortByDate ? 'date' : 'importance'}
              onChange={(event) => setParam('sort', event.target.value === 'date' ? 'date' : '')}
              className="min-h-11 max-w-full cursor-pointer rounded border border-control bg-surface px-2"
            >
              <option value="importance">{t('announcementsPage.sortImportance')}</option>
              <option value="date">{t('announcementsPage.sortDate')}</option>
            </select>
          </label>
        </div>
      </form>

      <div className="my-3 flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="text-muted">
          {t('announcementsPage.count', { shown: visible.length, unread })}
        </p>
        {/* aria-disabled instead of disabled, so keyboard focus is not lost after the click. */}
        <Button
          variant="secondary"
          aria-disabled={unread === 0}
          onClick={unread === 0 ? undefined : onMarkAll}
          className="aria-disabled:cursor-not-allowed aria-disabled:opacity-60"
        >
          {t('announcementsPage.markAll')}
        </Button>
      </div>

      {visible.length === 0 ? (
        <div>
          <p className="mb-3">{t('announcementsPage.noMatch')}</p>
          <Button variant="secondary" onClick={() => navigate({ search: '' }, { replace: true })}>
            {t('announcementsPage.clearFilters')}
          </Button>
        </div>
      ) : (
        <ul className="border-t border-border">
          {visible.map((item) => (
            <AnnouncementCard key={item.id} item={item} isRead={isRead(item.id)} onRead={onRead} />
          ))}
        </ul>
      )}
    </>
  );
}
