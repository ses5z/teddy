import { useEffect, useState, type ReactNode } from 'react';
import type { CourseListItem, Sourced } from '@teddy/shared';
import { dateFromOffset, events, rules } from '@teddy/shared/data';
import { Skeleton } from '../components/Skeleton';
import { DataSourceBadge } from '../components/SourceTag';
import { useProfile } from '../context/ProfileContext';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';
import type { TKey } from '../i18n';
import { formatDate } from '../utils';

// Read-only sample data pages, reached from the Home quick actions.
function InfoPage({ title, children }: { title: TKey; children: ReactNode }) {
  const { t } = useSettings();
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">{t(title)}</h1>
      <p className="mb-4 text-muted">
        {t('sample.notice')}
      </p>
      <ul className="border-t border-border">{children}</ul>
    </>
  );
}

const CARD = 'border-b border-border py-3';

export function CoursesScreen() {
  const { t, settings } = useSettings();
  const { profile } = useProfile();
  const lang = settings.language;
  const [courseList, setCourseList] = useState<Sourced<CourseListItem[]> | 'error' | null>(null);

  useEffect(() => {
    let active = true;
    api
      .courses(lang)
      .then((result) => active && setCourseList(result))
      .catch(() => active && setCourseList('error'));
    return () => {
      active = false;
    };
  }, [lang]);

  if (courseList === 'error') return <p role="alert">{t('course.error')}</p>;
  if (!courseList) return <Skeleton lines={5} />;

  const selected = profile?.courses;
  const visible =
    courseList.source === 'sample' && selected?.length
      ? courseList.data.filter((course) => selected.includes(course.code))
      : courseList.data;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('courses.title')}</h1>
        <DataSourceBadge source={courseList.source} />
      </div>
      <ul className="border-t border-border">
        {visible.map((course) => (
          <li key={course.id} className="border-b border-border">
            <Link to={`/courses/${course.id}`} className="block py-3 font-semibold transition-colors hover:bg-tint">
              {course.name === course.code ? course.code : `${course.code} · ${course.name}`}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export function EventsScreen() {
  const { settings } = useSettings();
  const lang = settings.language;
  return (
    <InfoPage title="events.title">
      {events.map((event) => (
        <li key={event.id} className={CARD}>
          <strong>{event.title[lang]}</strong>
          <br />
          {formatDate(dateFromOffset(event.offsetDays), lang)}, {event.time} · {event.location[lang]}
          <br />
          <span className="text-muted">{event.organizer}</span>
        </li>
      ))}
    </InfoPage>
  );
}

export function RulesScreen() {
  const { settings } = useSettings();
  const lang = settings.language;
  return (
    <InfoPage title="rules.title">
      {rules.map((rule) => (
        <li key={rule.id} className={CARD}>
          <h2 className="font-bold">{rule.title[lang]}</h2>
          <p className=" text-muted">{rule.article}</p>
          <p>{rule.summary[lang]}</p>
        </li>
      ))}
    </InfoPage>
  );
}
