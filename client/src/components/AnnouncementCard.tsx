import { useId, useState } from 'react';
import type { Announcement } from '@teddy/shared';
import { ExternalLink } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { formatFullDate, formatRelativeDate } from '../utils';
import { IMPORTANCE_STRIPE, ImportanceBadge } from './ImportanceBadge';

interface AnnouncementCardProps {
  item: Announcement;
  isRead: boolean;
  onRead: (id: string) => void;
}

export function AnnouncementCard({ item, isRead, onRead }: AnnouncementCardProps) {
  const { t, settings } = useSettings();
  const [open, setOpen] = useState(false);
  const messageId = useId();

  const toggle = () => {
    if (!open) onRead(item.id);
    setOpen(!open);
  };

  return (
    <li className={`min-w-0 border-b border-l-4 border-b-border py-3 pl-3 [overflow-wrap:anywhere] ${IMPORTANCE_STRIPE[item.importance]}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {!isRead && <span className="rounded border border-primary px-2 font-bold text-primary">{t('announcementsPage.new')}</span>}
        <ImportanceBadge level={item.importance} reason={item.importanceReason} />
        <span className="font-semibold">{item.courseCode}</span>
        <time
          dateTime={item.postedAt}
          title={formatFullDate(item.postedAt, settings.language)}
          className="text-muted"
        >
          {formatRelativeDate(item.postedAt, settings.language)}
        </time>
      </div>
      <h2 className={`mt-1 text-lg ${isRead ? 'font-medium' : 'font-bold'}`}>{item.title}</h2>
      <p id={messageId} className={open ? 'whitespace-pre-wrap' : 'line-clamp-2'}>
        {open ? item.message : item.summary}
      </p>
      <div className="flex flex-wrap items-center gap-x-4">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={messageId}
          onClick={toggle}
          className="min-h-11 cursor-pointer font-semibold text-primary underline"
        >
          {t(open ? 'common.readLess' : 'common.readMore')}
        </button>
        {item.moodleUrl && (
          <a
            href={item.moodleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1 underline"
          >
            <ExternalLink size={16} aria-hidden="true" />
            {t('course.openMoodle')}
            <span className="sr-only"> ({t('course.opensNewTab')})</span>
          </a>
        )}
      </div>
    </li>
  );
}
