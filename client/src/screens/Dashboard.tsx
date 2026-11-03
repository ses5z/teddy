import { useEffect, useMemo, useState } from 'react';
import type { Sourced, UpcomingItem } from '@teddy/shared';
import { Link } from 'react-router-dom';
import { DataSourceBadge } from '../components/SourceTag';
import { useSettings } from '../context/SettingsContext';
import { useStudyStats } from '../hooks/useStudyStats';
import { api } from '../services/api';
import type { StudyRecord } from '../types';
import { daysUntil, formatDate } from '../utils';

// A topic counts as hard from this average; needing the full explanation also counts.
const HARD_AVERAGE_HINTS = 2;
const SECTION = 'border-b border-border pb-5';

const average = (records: StudyRecord[]) =>
  records.reduce((sum, record) => sum + record.hintsUsed, 0) / records.length;

function groupBy(records: StudyRecord[], key: (record: StudyRecord) => string) {
  const groups = new Map<string, StudyRecord[]>();
  for (const record of records) groups.set(key(record), [...(groups.get(key(record)) ?? []), record]);
  return [...groups.values()];
}

export function Dashboard() {
  const { t, settings } = useSettings();
  const { records } = useStudyStats();
  const lang = settings.language;
  const [upcoming, setUpcoming] = useState<Sourced<UpcomingItem[]> | 'error' | null>(null);

  useEffect(() => {
    let active = true;
    api
      .upcoming(lang, 30)
      .then((result) => active && setUpcoming(result))
      .catch(() => active && setUpcoming('error'));
    return () => {
      active = false;
    };
  }, [lang]);

  const courseStats = useMemo(
    () =>
      groupBy(records, (record) => record.courseCode).map((group) => ({
        code: group[0].courseCode,
        count: group.length,
        hints: average(group),
      })),
    [records],
  );

  const hardTopics = useMemo(
    () =>
      groupBy(records, (record) => `${record.courseCode}|${record.topic}`)
        .map((group) => ({
          code: group[0].courseCode,
          topic: group[0].topic,
          hints: average(group),
          sawExplanation: group.some((record) => record.outcome === 'explanation'),
        }))
        .filter((topic) => topic.hints >= HARD_AVERAGE_HINTS || topic.sawExplanation)
        .sort((a, b) => b.hints - a.hints),
    [records],
  );

  const items = upcoming && upcoming !== 'error' ? upcoming.data : [];
  const nextExam = items.find((item) => item.type === 'exam');
  const suggestion = hardTopics[0]
    ? t('dashboard.suggestTopic', { course: hardTopics[0].code, topic: hardTopics[0].topic })
    : nextExam
      ? t('dashboard.suggestExam', { course: nextExam.courseCode, days: daysUntil(nextExam.date) })
      : t('dashboard.suggestStart');

  const formatHints = (value: number) =>
    value.toLocaleString(lang, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const countdown = (date: string) => {
    const days = daysUntil(date);
    if (days <= 0) return t('dashboard.today');
    return days === 1 ? t('dashboard.tomorrow') : t('dashboard.daysLeft', { count: days });
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>

      <section className="border-l-4 border-primary pl-4">
        <h2 className="font-bold">{t('dashboard.suggestion')}</h2>
        <p className="mb-1">{suggestion}</p>
        <Link to="/study" className="font-semibold text-primary underline">
          {t('dashboard.openStudy')}
        </Link>
      </section>

      <section aria-labelledby="dash-upcoming" className={SECTION}>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 id="dash-upcoming" className="text-xl font-bold">
            {t('dashboard.upcoming')}
          </h2>
          {upcoming && upcoming !== 'error' && <DataSourceBadge source={upcoming.source} />}
        </div>
        {upcoming === 'error' && <p role="alert">{t('home.upcomingError')}</p>}
        {upcoming && upcoming !== 'error' && upcoming.source === 'sample' && (
          <p className="mb-2 text-muted">{t('source.demo')}</p>
        )}
        {upcoming && upcoming !== 'error' && items.length === 0 && <p>{t('dashboard.upcomingEmpty')}</p>}
        <ul>
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap justify-between gap-x-4 border-t border-border py-2">
              <span>
                <strong>{item.courseCode}</strong> ·{' '}
                {t(item.type === 'exam' ? 'upcoming.exam' : 'upcoming.assignment')}: {item.title}
                <br />
                <span className="text-muted">{formatDate(item.date, lang)}</span>
              </span>
              <strong className="text-primary">{countdown(item.date)}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="dash-stats" className={SECTION}>
        <h2 id="dash-stats" className="mb-2 text-xl font-bold">
          {t('dashboard.stats')}
        </h2>
        {courseStats.length === 0 ? (
          <p>{t('dashboard.statsEmpty')}</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b-2 border-border">
                <th scope="col" className="py-2">{t('dashboard.course')}</th>
                <th scope="col" className="py-2">{t('dashboard.questions')}</th>
                <th scope="col" className="py-2">{t('dashboard.avgHints')}</th>
              </tr>
            </thead>
            <tbody>
              {courseStats.map((row) => (
                <tr key={row.code} className="border-b border-border">
                  <th scope="row" className="py-2 font-semibold">{row.code}</th>
                  <td className="py-2">{row.count}</td>
                  <td className="py-2">{formatHints(row.hints)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-labelledby="dash-hard">
        <h2 id="dash-hard" className="mb-2 text-xl font-bold">
          {t('dashboard.struggling')}
        </h2>
        {hardTopics.length === 0 ? (
          <p>{t('dashboard.strugglingEmpty')}</p>
        ) : (
          <ul>
            {hardTopics.map((topic) => (
              <li key={`${topic.code}-${topic.topic}`} className="border-t border-border py-2">
                <strong>{topic.code}</strong> · {topic.topic}{' '}
                <span className="text-muted">({t('dashboard.strugglingItem', { hints: formatHints(topic.hints) })})</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
