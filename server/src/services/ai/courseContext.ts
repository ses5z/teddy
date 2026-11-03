import type { ChatSource, CoursePackage, CourseSection, Language } from '@teddy/shared';
import { packagesForCourse } from '../courseCatalog';
import { getCoursePackages } from '../coursePackages';
import { hasAny, normalize } from './textMatch';

// Rough size limit for Moodle data sent to the LLM.
const MAX_CHARS = 20_000;
const ANNOUNCEMENT_CHARS = 1500;

const ANNOUNCEMENT_WORDS = ['duyuru', 'announcement'];
const ASSIGNMENT_WORDS = ['odev', 'teslim', 'assignment', 'homework', 'due'];
const EXAM_WORDS = ['sinav', 'vize', 'final', 'quiz', 'exam', 'midterm'];
const WEEK_WORDS = ['bu hafta', 'haftaya', 'this week', 'next week'];
const COURSE_CONTENT_WORDS = ['konu', 'isleniyor', 'islenecek', 'materyal', 'slayt', 'ders notu', 'topic', 'material', 'slide', 'lecture', 'syllabus'];

export interface MoodleContext {
  data: unknown;
  refs: Map<string, ChatSource>;
  /** Set when the question needs a course that can't be identified */
  clarify?: string[];
}

const compact = (text: string) => normalize(text).replace(/[^a-z0-9]/g, '');

/** Matches "LIBE120", "libe 120", "Libe". Returns every section of that course. */
export function matchCourses(question: string, packages: CoursePackage[]): CoursePackage[] {
  const text = normalize(question);
  const squeezed = compact(question);
  return packages.filter((item) => {
    const match = item.code.match(/^([A-Z]+) (\d+)/);
    if (!match) return squeezed.includes(compact(item.shortname));
    const [, department, number] = match;
    const codeHit = squeezed.includes(`${department}${number}`.toLowerCase());
    const departmentHit = new RegExp(`(^|[^a-z0-9])${department.toLowerCase()}($|[^a-z0-9])`).test(text);
    return codeHit || departmentHit;
  });
}

function formatDay(iso: string, language: Language): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'long' }).format(
    new Date(year, month - 1, day),
  );
}

const LABELS = {
  announcements: { tr: 'Duyurular', en: 'Announcements' },
  topics: { tr: 'Konular', en: 'Topics' },
  assignments: { tr: 'Ödevler', en: 'Assignments' },
};

/** Current week first, then sections sharing words with the question, then the newest with content. */
function rankSections(sections: CourseSection[], question: string): CourseSection[] {
  const words = normalize(question).split(/[^a-z0-9]+/).filter((word) => word.length > 3);
  const score = (section: CourseSection) => {
    const text = normalize(`${section.name} ${section.summary} ${section.materials.map((item) => item.name).join(' ')}`);
    return (section.isCurrentWeek ? 100 : 0) + words.filter((word) => text.includes(word)).length * 5;
  };
  return sections
    .filter((section) => section.isCurrentWeek || section.materials.length > 0 || section.summary)
    .sort((a, b) => score(b) - score(a) || b.number - a.number);
}

export async function buildMoodleContext(
  question: string,
  language: Language,
  courseId?: number,
): Promise<MoodleContext | null> {
  const packages = await getCoursePackages();
  if (!packages) return null;

  const text = normalize(question);
  // A course page sets the course; a course named in the question still wins.
  const named = matchCourses(question, packages);
  const matched = named.length || courseId == null ? named : packagesForCourse(courseId, packages);
  const wantsAnnouncements = hasAny(text, ANNOUNCEMENT_WORDS);
  // Exam dates are usually only in announcements, so exam questions read those too.
  const wantsExam = hasAny(text, EXAM_WORDS);
  const wantsAssignments = hasAny(text, ASSIGNMENT_WORDS) || wantsExam;
  const wantsWeek = hasAny(text, WEEK_WORDS);
  const wantsContent = hasAny(text, COURSE_CONTENT_WORDS);

  const refs = new Map<string, ChatSource>();

  if (!matched.length && wantsContent && !wantsWeek && !wantsAnnouncements && !wantsAssignments) {
    const codes = [...new Set(packages.map((item) => item.code.replace(/ \(.*\)$/, '')))];
    return { data: null, refs, clarify: codes };
  }

  const nothingAsked = !matched.length && !wantsAnnouncements && !wantsAssignments && !wantsWeek;
  const chosen = matched.length ? matched : nothingAsked ? [] : packages;
  // A named course with no specific topic gets everything; otherwise only the asked parts.
  const includeAll = matched.length > 0 && !wantsAnnouncements && !wantsAssignments;

  let nextRef = 1;
  const addRef = (source: ChatSource) => {
    const ref = `m${nextRef++}`;
    refs.set(ref, source);
    return ref;
  };

  let budget = MAX_CHARS;
  const fits = (value: unknown) => {
    const size = JSON.stringify(value).length;
    if (size > budget) return false;
    budget -= size;
    return true;
  };

  const courses = chosen.map((item) => {
    const course: Record<string, unknown> = { code: item.code, name: item.name };

    if (includeAll || wantsAnnouncements || wantsExam) {
      const list = [];
      for (const announcement of item.announcements) {
        const entry = {
          title: announcement.title,
          date: announcement.date,
          text: announcement.text.slice(0, ANNOUNCEMENT_CHARS),
        };
        if (!fits(entry)) break;
        list.push({
          ...entry,
          ref: addRef({
            label: `Moodle – ${item.code} – ${LABELS.announcements[language]} (${formatDay(announcement.date, language)})`,
            url: announcement.url,
          }),
        });
      }
      course.announcements = list;
    }

    if (includeAll || wantsWeek) {
      const ranked = rankSections(item.sections, question);
      const candidates = wantsWeek && !matched.length ? ranked.slice(0, 1) : ranked;
      const list = [];
      for (const section of candidates) {
        const entry = {
          name: section.name,
          summary: section.summary,
          isCurrentWeek: section.isCurrentWeek,
          materials: section.materials.map((material) => `${material.name} (${material.type})`),
        };
        if (!fits(entry)) continue;
        list.push({
          ...entry,
          ref: addRef({ label: `Moodle – ${item.code} – ${LABELS.topics[language]} (${section.name})`, url: section.url }),
        });
      }
      course.sections = list;
    }

    if (includeAll || wantsAssignments || wantsWeek) {
      course.upcoming = item.upcoming.map((entry) => ({
        type: entry.type,
        title: entry.title,
        date: entry.date,
        ref: addRef({ label: `Moodle – ${item.code} – ${LABELS.assignments[language]}`, url: entry.url ?? item.url }),
      }));
    }
    return course;
  });

  return {
    data: { enrolled: packages.map((item) => item.code), courses },
    refs,
  };
}
