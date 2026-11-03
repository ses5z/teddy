import { courses } from '@teddy/shared/data';
import type { CourseSummary, Language, MoodleProfile, Sourced, UpcomingItem } from '@teddy/shared';
import { dateFromOffset } from '@teddy/shared/data';
import { getSnapshot } from './moodleService';
import { getSampleUpcoming } from './sampleData';

// One entry point per data need: Moodle first, sample data when it isn't available.

export async function getUpcoming(language: Language, days: number): Promise<Sourced<UpcomingItem[]>> {
  try {
    const { upcoming } = await getSnapshot();
    const last = dateFromOffset(days);
    return { source: 'moodle', data: upcoming.filter((item) => item.date <= last) };
  } catch {
    return { source: 'sample', data: getSampleUpcoming(language, days) };
  }
}

export async function getCourses(language: Language): Promise<Sourced<CourseSummary[]>> {
  try {
    const snapshot = await getSnapshot();
    return { source: 'moodle', data: snapshot.courses };
  } catch {
    return {
      source: 'sample',
      data: courses.map((course) => ({ code: course.code, name: course.name[language] })),
    };
  }
}

/** Null when Moodle isn't connected; the login screen then asks the student directly. */
export async function getMoodleProfile(): Promise<MoodleProfile | null> {
  try {
    const { name, courses: enrolled } = await getSnapshot();
    return { name, courses: enrolled };
  } catch {
    return null;
  }
}
