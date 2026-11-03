import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Announcement, DataSource, Sourced } from '@teddy/shared';
import { useStoredState } from '../hooks/useStoredState';
import { api } from '../services/api';
import { useSettings } from './SettingsContext';

interface ReadAnnouncementsValue {
  status: 'loading' | 'ready' | 'error';
  source: DataSource | null;
  announcements: Announcement[];
  /** Null when the list could not be loaded, so the menu badge stays hidden. */
  unreadCount: number | null;
  isRead: (id: string) => boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  reload: () => void;
}

const ReadAnnouncementsContext = createContext<ReadAnnouncementsValue | null>(null);

/** Stored data may be edited or corrupted, so only an array of strings is trusted. */
function sanitize(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
}

// Single source for the announcements list and read state: the menu badge and the
// Announcements screen read the same data, so the badge updates without a page change.
export function ReadAnnouncementsProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const lang = settings.language;
  const [stored, setStored] = useStoredState<string[]>('readAnnouncements', []);
  const [result, setResult] = useState<Sourced<Announcement[]> | null>(null);
  const [status, setStatus] = useState<ReadAnnouncementsValue['status']>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    api
      .announcements(lang)
      .then((data) => {
        if (!active) return;
        setResult(data);
        setStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setResult(null);
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [lang, attempt]);

  const readIds = useMemo(() => new Set(sanitize(stored)), [stored]);
  const announcements = useMemo(() => result?.data ?? [], [result]);

  const markRead = useCallback(
    (id: string) => setStored((prev) => (sanitize(prev).includes(id) ? prev : [...sanitize(prev), id])),
    [setStored],
  );

  const markAllRead = useCallback(
    () => setStored((prev) => [...new Set([...sanitize(prev), ...announcements.map((item) => item.id)])]),
    [setStored, announcements],
  );

  const value = useMemo<ReadAnnouncementsValue>(
    () => ({
      status,
      source: result?.source ?? null,
      announcements,
      unreadCount: result ? announcements.filter((item) => !readIds.has(item.id)).length : null,
      isRead: (id) => readIds.has(id),
      markRead,
      markAllRead,
      reload: () => setAttempt((count) => count + 1),
    }),
    [status, result, announcements, readIds, markRead, markAllRead],
  );

  return <ReadAnnouncementsContext.Provider value={value}>{children}</ReadAnnouncementsContext.Provider>;
}

export function useReadAnnouncements() {
  const value = useContext(ReadAnnouncementsContext);
  if (!value) throw new Error('useReadAnnouncements must be used inside ReadAnnouncementsProvider');
  return value;
}
