import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useReadAnnouncements } from '../context/ReadAnnouncementsContext';
import { useSettings } from '../context/SettingsContext';
import { AnnouncementCard } from './AnnouncementCard';
import { IMPORTANCE_RANK } from './ImportanceBadge';
import { DataSourceBadge } from './SourceTag';

const MAX_ITEMS = 5;

export function AnnouncementsBox() {
  const { t } = useSettings();
  const { status, source, announcements, isRead, markRead } = useReadAnnouncements();

  const items = useMemo(
    () =>
      [...announcements]
        .sort((a, b) => IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance] || b.postedAt.localeCompare(a.postedAt))
        .slice(0, MAX_ITEMS),
    [announcements],
  );

  return (
    <section aria-labelledby="announcements-title" className="border-t-2 border-primary pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 id="announcements-title" className="text-lg font-bold">
          {t('announcements.title')}
        </h2>
        {status === 'ready' && source && <DataSourceBadge source={source} />}
      </div>
      {status === 'error' && <p role="alert">{t('announcements.offline')}</p>}
      {status === 'ready' && items.length === 0 && <p>{t('announcements.empty')}</p>}
      <ul>
        {items.map((item) => (
          <AnnouncementCard key={item.id} item={item} isRead={isRead(item.id)} onRead={markRead} heading="h3" />
        ))}
      </ul>
      <Link to="/announcements" className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary underline">
        {t('announcements.all')}
      </Link>
    </section>
  );
}
