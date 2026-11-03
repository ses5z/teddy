import { useEffect, useMemo, useState } from 'react';
import type { Assignment } from '@teddy/shared';
import { AlertTriangle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useReadAnnouncements } from '../context/ReadAnnouncementsContext';
import { useSettings } from '../context/SettingsContext';
import { useStoredState } from '../hooks/useStoredState';
import { api } from '../services/api';

/** Stored data may be edited or corrupted, so only an array of strings is trusted. */
function sanitize(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
}

function targetOf(hasAnnouncements: boolean, assignments: Assignment[]): string {
  if (hasAnnouncements) return '/announcements?importance=critical';
  const courseIds = new Set(assignments.map((item) => item.courseId));
  return courseIds.size === 1 ? `/courses/${assignments[0].courseId}?tab=assignments` : '/courses';
}

// Dismissing remembers the ids shown, so only a new urgent item brings the banner back.
export function CriticalBanner() {
  const { t, settings } = useSettings();
  const lang = settings.language;
  const { status, announcements } = useReadAnnouncements();
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [stored, setStored] = useStoredState<string[]>('dismissedCritical', []);

  useEffect(() => {
    let active = true;
    api
      .assignments(lang, 'critical')
      .then((result) => active && setAssignments(result.data))
      .catch(() => active && setAssignments([]));
    return () => {
      active = false;
    };
  }, [lang]);

  const critical = useMemo(() => announcements.filter((item) => item.importance === 'critical'), [announcements]);
  // Waits for both, so the count doesn't change after it is announced.
  const ready = status !== 'loading' && assignments != null;
  const ids = [...critical.map((item) => item.id), ...(assignments ?? []).map((item) => item.id)];
  const dismissed = sanitize(stored);
  const show = ready && ids.some((id) => !dismissed.includes(id));

  const dismiss = () => {
    setStored([...new Set([...dismissed, ...ids])]);
    // The focused button is about to disappear.
    document.getElementById('main')?.focus();
  };

  const count = assignments?.length ?? 0;
  const form = (n: number) => (n === 1 ? 'one' : 'other');
  // Short wording when both apply: this has to fit one line on a phone at the largest text size.
  const text =
    critical.length && count
      ? t('critical.both', {
          announcements: t(`critical.bothAnnouncements.${form(critical.length)}`, { count: critical.length }),
          assignments: t(`critical.bothAssignments.${form(count)}`, { count }),
        })
      : critical.length
        ? t(`critical.announcements.${form(critical.length)}`, { count: critical.length })
        : t(`critical.assignments.${form(count)}`, { count });

  return (
    <div aria-live="polite" className="mb-5 empty:mb-0">
      {show && (
        <div className="flex items-center rounded border-l-4 border-critical bg-critical-bg font-semibold text-critical">
          <Link
            to={targetOf(critical.length > 0, assignments ?? [])}
            title={text}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-1 px-1 underline"
          >
            <AlertTriangle size={18} aria-hidden="true" className="shrink-0" />
            <span className="truncate">{text}</span>
          </Link>
          <button
            type="button"
            aria-label={t('critical.dismiss')}
            onClick={dismiss}
            className="inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
