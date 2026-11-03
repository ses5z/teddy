import { Router } from 'express';
import type { CalendarApiEntry, CalendarResponse, UpcomingItem } from '@teddy/shared';
import calendarFile from '@teddy/shared/data/tedu-calendar.json';
import { getSnapshot } from '../services/moodleService';

interface TeduEntry {
  id: string;
  name: string;
  nameTr?: string;
  start: string;
  end: string;
  type: CalendarApiEntry['type'];
}

export const calendarRouter = Router();

// Official dates always work; Moodle deadlines are added when it is connected.
calendarRouter.get('/', async (req, res) => {
  const language = req.query.lang === 'en' ? 'en' : 'tr';
  const { sourceUrl, lastFetchedAt } = calendarFile;
  const entries: CalendarApiEntry[] = (calendarFile.items as TeduEntry[]).map((item) => ({
    id: item.id,
    name: language === 'tr' && item.nameTr ? item.nameTr : item.name,
    start: item.start,
    end: item.end,
    type: item.type,
    source: 'tedu',
    sourceUrl,
    lastFetchedAt,
  }));

  try {
    const snapshot = await getSnapshot();
    entries.push(
      ...snapshot.upcoming.map((item: UpcomingItem) => ({
        id: `moodle-${item.id}`,
        name: `${item.courseCode}: ${item.title}`,
        start: item.date,
        end: item.date,
        type: 'moodle' as const,
        source: 'moodle' as const,
        sourceUrl: item.url ?? '',
        lastFetchedAt: snapshot.fetchedAt,
      })),
    );
  } catch {
    // Moodle is optional here.
  }

  entries.sort((a, b) => a.start.localeCompare(b.start));
  const body: CalendarResponse = { entries, sourceUrl, lastFetchedAt };
  res.json(body);
});
