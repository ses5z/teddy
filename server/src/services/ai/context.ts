import { calendar, courses, dateFromOffset, events, faq, rules } from '@teddy/shared/data';
import type { ChatSource, DataSource, Language } from '@teddy/shared';
import { getCourseDetail } from '../courseCatalog';
import { getUpcoming } from '../dataService';
import { buildMoodleContext } from './courseContext';

const UPCOMING_DAYS = 30;

interface ChatContext {
  text: string;
  moodleUsed: DataSource;
  refs: Map<string, ChatSource>;
  clarify?: string[];
}

/**
 * Data sent to the LLM. From Moodle: only what the question needs, chosen in courseContext.ts.
 * The student's name and Moodle user id are left out, and the token is never here.
 */
export async function buildChatContext(question: string, language: Language, courseId?: number): Promise<ChatContext> {
  const moodle = await buildMoodleContext(question, language, courseId);
  if (moodle?.clarify) return { text: '', moodleUsed: 'moodle', refs: moodle.refs, clarify: moodle.clarify };

  const base = {
    note: 'Campus data is SAMPLE data for a demo. It is not real TED University information.',
    today: dateFromOffset(0),
    calendar: calendar.map((item) => ({ title: item.title[language], start: item.start, end: item.end })),
    rules: rules.map((item) => ({ article: item.article, title: item.title[language], summary: item.summary[language] })),
    events: events.map((item) => ({
      title: item.title[language],
      date: dateFromOffset(item.offsetDays),
      time: item.time,
      location: item.location[language],
    })),
    faq: faq.map((item) => ({ question: item.question[language], answer: item.answer[language] })),
  };

  if (moodle) {
    // Course questions get real data only, so sample dates can't leak into an answer about a real course.
    const aboutCourses = (moodle.data as { courses: unknown[] }).courses.length > 0;
    const data = aboutCourses ? { today: base.today, moodle: moodle.data } : { ...base, moodle: moodle.data };
    return { text: JSON.stringify(data), moodleUsed: 'moodle', refs: moodle.refs };
  }

  const upcoming = await getUpcoming(language, UPCOMING_DAYS);
  const data = {
    ...base,
    courses: courses.map((item) => ({
      code: item.code,
      name: item.name[language],
      instructor: item.instructor,
      officeHours: item.officeHours[language],
    })),
    sampleDeadlines: upcoming.data,
    selectedCourse: courseId == null ? undefined : await getCourseDetail(courseId, language),
  };
  return { text: JSON.stringify(data), moodleUsed: 'sample', refs: new Map() };
}
