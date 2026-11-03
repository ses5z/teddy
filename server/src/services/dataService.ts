import type { Language, MoodleProfile, Sourced, UpcomingItem } from '@teddy/shared';
import { dateFromOffset } from '@teddy/shared/data';
import { readableCode } from './coursePackages';
import { getSnapshot } from './moodleService';
import { getSampleUpcoming } from './sampleData';

// One entry point per data need: Moodle first, sample data when it isn't available.

export async function getUpcoming(language: Language, days: number): Promise<Sourced<UpcomingItem[]>> {
  try {
    const { upcoming } = await getSnapshot();
    const last = dateFromOffset(days);
    return {
      source: 'moodle',
      data: upcoming
        .filter((item) => item.date <= last)
        .map((item) => ({ ...item, courseCode: readableCode(item.courseCode).label })),
    };
  } catch {
    return { source: 'sample', data: getSampleUpcoming(language, days) };
  }
}

/** Null when Moodle isn't connected; the login screen then asks the student directly. */
export async function getMoodleProfile(): Promise<MoodleProfile | null> {
  try {
    const { name, courses: enrolled } = await getSnapshot();
    // Moodle full names here repeat the raw short name, so both show the readable code.
    return {
      name,
      courses: enrolled.map((course) => {
        const { label } = readableCode(course.code);
        return { ...course, code: label, name: course.name.includes('_') ? label : course.name };
      }),
    };
  } catch {
    return null;
  }
}
