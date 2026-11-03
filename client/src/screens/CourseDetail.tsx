import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Announcement, Assignment, CourseDetail, DataSource } from '@teddy/shared';
import {
  ArrowLeft,
  ChevronDown,
  ClipboardCheck,
  ExternalLink,
  File,
  FileText,
  Folder,
  GraduationCap,
  Link2,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { IMPORTANCE_STRIPE, ImportanceBadge } from '../components/ImportanceBadge';
import { Skeleton } from '../components/Skeleton';
import { DataSourceBadge } from '../components/SourceTag';
import { useSettings } from '../context/SettingsContext';
import type { TKey } from '../i18n';
import { api } from '../services/api';
import { formatDate, remaining } from '../utils';

const TABS: { id: string; label: TKey }[] = [
  { id: 'overview', label: 'course.overview' },
  { id: 'announcements', label: 'course.announcements' },
  { id: 'topics', label: 'course.topics' },
  { id: 'assignments', label: 'course.assignments' },
];

const MATERIAL_ICONS: Record<string, LucideIcon> = {
  resource: FileText,
  url: Link2,
  folder: Folder,
  quiz: ClipboardCheck,
  assign: ClipboardCheck,
  forum: MessageSquare,
};

function ExternalAnchor({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const { t } = useSettings();
  if (!href) return <>{children}</>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`underline ${className ?? ''}`}>
      {children}
      <span className="sr-only"> ({t('course.opensNewTab')})</span>
    </a>
  );
}

function useCountdown() {
  const { t } = useSettings();
  return (dueAt: string | null): string => {
    if (!dueAt) return t('course.noDue');
    const left = remaining(dueAt);
    if (left.kind === 'overdue') return t('course.overdue');
    if (left.kind === 'minutes') return t('course.left.minutes', { minutes: left.minutes });
    if (left.kind === 'hours') return t('course.left.hours', { hours: left.hours });
    return t('course.left.days', { days: left.days, hours: left.hours });
  };
}

function AnnouncementRow({ item }: { item: Announcement }) {
  const { t, settings } = useSettings();
  const [open, setOpen] = useState(false);
  const isLong = item.summary !== item.message;
  return (
    <li className={`border-b border-l-4 border-b-border py-3 pl-3 ${IMPORTANCE_STRIPE[item.importance]}`}>
      <ImportanceBadge level={item.importance} reason={item.importanceReason} />
      <h3 className="font-bold">
        <ExternalAnchor href={item.moodleUrl}>{item.title}</ExternalAnchor>
      </h3>
      <p className="text-muted">
        {formatDate(item.postedAt, settings.language)}
        {item.author && ` · ${item.author}`}
      </p>
      <p className="whitespace-pre-wrap">{open ? item.message : item.summary}</p>
      {isLong && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="min-h-11 cursor-pointer font-semibold text-primary underline"
        >
          {t(open ? 'common.readLess' : 'common.readMore')}
        </button>
      )}
    </li>
  );
}

function AssignmentRow({ item }: { item: Assignment }) {
  const { t, settings } = useSettings();
  const countdown = useCountdown();
  const past = item.dueAt != null && new Date(item.dueAt).getTime() < Date.now();
  return (
    <li className={`border-b border-l-4 border-b-border py-3 pl-3 ${IMPORTANCE_STRIPE[item.importance]} ${past ? 'text-muted' : ''}`}>
      <ImportanceBadge level={item.importance} reason={item.importanceReason} />
      <h3 className="font-semibold">
        <ExternalAnchor href={item.moodleUrl}>{item.name}</ExternalAnchor>
      </h3>
      <p className={past ? '' : 'text-muted'}>
        {t(item.kind === 'exam' ? 'upcoming.exam' : 'upcoming.assignment')}
        {item.dueAt && ` · ${formatDate(item.dueAt.slice(0, 10), settings.language)}`}
      </p>
      <p className={past ? '' : 'font-semibold text-primary'}>{countdown(item.dueAt)}</p>
    </li>
  );
}

/** Upcoming first by due date; past and undated at the bottom. */
function sortAssignments(items: Assignment[]): Assignment[] {
  const now = Date.now();
  const time = (item: Assignment) => (item.dueAt ? new Date(item.dueAt).getTime() : Number.POSITIVE_INFINITY);
  const upcoming = items.filter((item) => time(item) >= now).sort((a, b) => time(a) - time(b));
  const past = items.filter((item) => time(item) < now).sort((a, b) => time(b) - time(a));
  return [...upcoming, ...past];
}

function Box({ title, onSeeAll, children }: { title: string; onSeeAll?: () => void; children: ReactNode }) {
  const { t } = useSettings();
  return (
    <section className="border-b border-border pb-4">
      <h2 className="mb-2 text-xl font-bold">{title}</h2>
      {children}
      {onSeeAll && (
        <button type="button" onClick={onSeeAll} className="mt-2 min-h-11 cursor-pointer font-semibold text-primary underline">
          {t('common.seeAll')}
        </button>
      )}
    </section>
  );
}

function TopicsTab({ course }: { course: CourseDetail }) {
  const { t } = useSettings();
  const [openTitles, setOpenTitles] = useState<Set<string>>(
    () => new Set(course.sections.filter((section) => section.isCurrentWeek).map((section) => section.title)),
  );
  if (course.sections.length === 0) return <p>{t('course.none.topics')}</p>;

  const toggle = (title: string) =>
    setOpenTitles((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });

  return (
    <ul className="border-t border-border">
      {course.sections.map((section, index) => {
        const open = openTitles.has(section.title);
        return (
          <li key={section.title} className="border-b border-border">
            <h2>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`section-${index}`}
                onClick={() => toggle(section.title)}
                className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-2 py-2 text-left font-bold transition-colors hover:bg-tint"
              >
                <span>
                  {section.title}
                  {section.isCurrentWeek && <span className="ml-2 text-primary">· {t('course.currentWeek')}</span>}
                </span>
                <ChevronDown
                  size={18}
                  aria-hidden="true"
                  className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </button>
            </h2>
            {open && (
              <div id={`section-${index}`} className="pb-3">
                {section.summary && <p className="mb-2 whitespace-pre-wrap text-muted">{section.summary}</p>}
                {section.items.length === 0 && !section.summary && <p className="text-muted">{t('course.noThisWeek')}</p>}
                <ul className="flex flex-col gap-1">
                  {section.items.map((item) => {
                    const Icon = MATERIAL_ICONS[item.type] ?? File;
                    return (
                      <li key={`${item.name}-${item.url}`} className="flex items-start gap-2">
                        <Icon size={18} className="mt-1 shrink-0 text-primary" aria-hidden="true" />
                        <ExternalAnchor href={item.url}>{item.name}</ExternalAnchor>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function CourseDetailScreen() {
  const { t, settings } = useSettings();
  const { id } = useParams();
  const courseId = Number(id);
  const lang = settings.language;
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState<{ source: DataSource; data: CourseDetail } | 'error' | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const load = useCallback(() => {
    setState(null);
    api
      .course(courseId, lang)
      .then(setState)
      .catch(() => setState('error'));
  }, [courseId, lang]);

  useEffect(load, [load]);

  const tabIndex = Math.max(0, TABS.findIndex((tab) => tab.id === searchParams.get('tab')));
  const goTo = (index: number) => setSearchParams({ tab: TABS[index].id }, { replace: true });

  // Standard tab keyboard pattern: arrow keys move between tabs.
  const onTabKey = (event: KeyboardEvent) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next = (tabIndex + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
    goTo(next);
    tabRefs.current[next]?.focus();
  };

  const backLink = (
    <Link to="/courses" className="mb-3 inline-flex min-h-11 items-center gap-1 underline">
      <ArrowLeft size={18} aria-hidden="true" />
      {t('course.back')}
    </Link>
  );

  if (state === null) return <Skeleton lines={7} label={t('course.loading')} />;
  if (state === 'error') {
    return (
      <>
        {backLink}
        <p role="alert" className="mb-3 font-semibold">
          {t('course.error')}
        </p>
        <Button onClick={load}>{t('common.retry')}</Button>
      </>
    );
  }

  const course = state.data;
  const sorted = sortAssignments(course.assignments);
  const nextThree = sorted.filter((item) => item.dueAt && new Date(item.dueAt).getTime() >= Date.now()).slice(0, 3);
  const activeTab = TABS[tabIndex].id;

  return (
    <div className="flex flex-col gap-3 pb-20">
      <div>{backLink}</div>
      <header>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-3xl font-bold">{course.code}</h1>
          <DataSourceBadge source={state.source} />
        </div>
        {course.name !== course.code && <p className="text-lg">{course.name}</p>}
        {course.teacher && <p className="text-muted">{t('course.teacher', { name: course.teacher })}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-4">
          {course.moodleUrl && (
            <ExternalAnchor href={course.moodleUrl} className="inline-flex min-h-11 items-center gap-1">
              <ExternalLink size={16} aria-hidden="true" />
              {t('course.openMoodle')}
            </ExternalAnchor>
          )}
          <Link to={`/study?course=${encodeURIComponent(course.code)}`} className="inline-flex min-h-11 items-center gap-1 underline">
            <GraduationCap size={18} aria-hidden="true" />
            {t('course.study')}
          </Link>
        </div>
      </header>

      <div role="tablist" aria-label={t('course.tabs')} className="flex overflow-x-auto border-b border-border">
        {TABS.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={tabIndex === index}
            aria-controls={`panel-${tab.id}`}
            tabIndex={tabIndex === index ? 0 : -1}
            onClick={() => goTo(index)}
            onKeyDown={onTabKey}
            className={`min-h-11 shrink-0 cursor-pointer border-b-2 px-3 whitespace-nowrap transition-colors ${
              tabIndex === index ? 'border-primary font-bold text-primary' : 'border-transparent text-muted'
            }`}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} tabIndex={0} className="flex flex-col gap-4">
        {activeTab === 'overview' && (
          <>
            <Box title={t('course.thisWeek')} onSeeAll={() => goTo(2)}>
              {course.currentWeek ? (
                <>
                  <p className="font-semibold">{course.currentWeek.title}</p>
                  {course.currentWeek.summary && <p className="whitespace-pre-wrap">{course.currentWeek.summary}</p>}
                </>
              ) : (
                <p>{t('course.noThisWeek')}</p>
              )}
            </Box>
            <Box title={t('course.upcoming')} onSeeAll={() => goTo(3)}>
              {nextThree.length === 0 ? (
                <p>{t('course.noAssignments')}</p>
              ) : (
                <ul>
                  {nextThree.map((item) => (
                    <AssignmentRow key={item.id} item={item} />
                  ))}
                </ul>
              )}
            </Box>
            <Box title={t('course.latest')} onSeeAll={() => goTo(1)}>
              {course.announcements.length === 0 ? (
                <p>{t('course.none.announcements')}</p>
              ) : (
                <ul>
                  {course.announcements.slice(0, 3).map((item) => (
                    <AnnouncementRow key={item.id} item={item} />
                  ))}
                </ul>
              )}
            </Box>
          </>
        )}

        {activeTab === 'announcements' &&
          (course.announcements.length === 0 ? (
            <p>{t('course.none.announcements')}</p>
          ) : (
            <ul>
              {course.announcements.map((item) => (
                <AnnouncementRow key={item.id} item={item} />
              ))}
            </ul>
          ))}

        {activeTab === 'topics' && <TopicsTab course={course} />}

        {activeTab === 'assignments' &&
          (sorted.length === 0 ? (
            <p>{t('course.none.assignments')}</p>
          ) : (
            <ul>
              {sorted.map((item) => (
                <AssignmentRow key={item.id} item={item} />
              ))}
            </ul>
          ))}
      </div>

      {/* Sits above the mobile bottom menu; on desktop it stays in the corner of the content. */}
      <div className="fixed inset-x-0 bottom-20 z-10 border-t border-border bg-surface p-2 md:static md:border-0 md:bg-transparent md:p-0">
        <Link
          to={`/chat?courseId=${course.id}`}
          className="flex min-h-11 items-center justify-center gap-2 rounded bg-primary px-4 py-2 font-semibold text-on-primary md:inline-flex"
        >
          <MessageSquare size={18} aria-hidden="true" />
          {t('course.askTeddy')}
        </Link>
      </div>
    </div>
  );
}
