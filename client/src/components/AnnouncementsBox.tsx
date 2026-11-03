import { useEffect, useState } from 'react';
import type { Announcement, Sourced } from '@teddy/shared';
import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';
import { formatDate } from '../utils';
import { DataSourceBadge } from './SourceTag';

export function AnnouncementsBox() {
  const { t, settings } = useSettings();
  const lang = settings.language;
  const [result, setResult] = useState<Sourced<Announcement[]> | 'error' | null>(null);

  useEffect(() => {
    let active = true;
    api
      .announcements(lang)
      .then((data) => active && setResult(data))
      .catch(() => active && setResult('error'));
    return () => {
      active = false;
    };
  }, [lang]);

  const items = result && result !== 'error' ? result.data.slice(0, 5) : [];

  return (
    <section aria-labelledby="announcements-title" className="border-t-2 border-primary pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 id="announcements-title" className="text-lg font-bold">
          {t('announcements.title')}
        </h2>
        {result && result !== 'error' && <DataSourceBadge source={result.source} />}
      </div>
      {result === 'error' && <p role="alert">{t('announcements.offline')}</p>}
      {result && result !== 'error' && items.length === 0 && <p>{t('announcements.empty')}</p>}
      <ul>
        {items.map((item) => (
          <li key={item.id} className="border-t border-border py-2">
            <strong>{item.courseCode}</strong> ·{' '}
            {item.moodleUrl ? (
              <a href={item.moodleUrl} target="_blank" rel="noopener noreferrer" className="underline">
                {item.title}
                <span className="sr-only"> ({t('course.opensNewTab')})</span>
              </a>
            ) : (
              item.title
            )}
            <br />
            <span className="text-muted">{formatDate(item.postedAt, lang)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
