import { useEffect, useState } from 'react';
import type { Sourced, UpcomingItem } from '@teddy/shared';
import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';
import { formatDate } from '../utils';
import { DataSourceBadge } from './SourceTag';

export function UpcomingBox() {
  const { t, settings } = useSettings();
  const [state, setState] = useState<Sourced<UpcomingItem[]> | 'error' | null>(null);

  useEffect(() => {
    let active = true;
    api
      .upcoming(settings.language)
      .then((result) => active && setState(result))
      .catch(() => active && setState('error'));
    return () => {
      active = false;
    };
  }, [settings.language]);

  return (
    <section aria-labelledby="upcoming-title" className="border-t-2 border-primary pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 id="upcoming-title" className="text-lg font-bold">
          {t('home.upcoming')}
        </h2>
        {state && state !== 'error' && <DataSourceBadge source={state.source} />}
      </div>
      {state === 'error' && <p role="alert">{t('home.upcomingError')}</p>}
      {state && state !== 'error' && state.source === 'sample' && (
        <p className="mb-2 text-muted">{t('source.demo')}</p>
      )}
      {state && state !== 'error' && state.data.length === 0 && <p>{t('home.upcomingEmpty')}</p>}
      {state && state !== 'error' && (
        <ul className="flex flex-col gap-2">
          {state.data.map((item) => (
            <li key={item.id} className="border-t border-border pt-2">
              <strong>{item.courseCode}</strong> · {t(item.type === 'exam' ? 'upcoming.exam' : 'upcoming.assignment')}:{' '}
              {item.title}
              <br />
              <span className="text-muted">{formatDate(item.date, settings.language)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
