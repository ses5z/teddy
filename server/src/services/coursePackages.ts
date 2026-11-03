import type { CoursePackage, CourseSection, RawAnnouncement } from '@teddy/shared';
import { TtlCache } from './cache';
import { call, getSnapshot, moodleBaseUrl, onMoodleCacheClear } from './moodleService';

const CACHE_TTL_MS = 10 * 60 * 1000;
const ANNOUNCEMENTS_PER_COURSE = '10';
const PARALLEL_COURSES = 3;

const cache = new TtlCache<CoursePackage[]>();
const teacherCache = new TtlCache<Map<number, string>>();
let inFlight: Promise<CoursePackage[]> | null = null;
onMoodleCacheClear(() => {
  cache.clear();
  teacherCache.clear();
});

interface RawSection {
  section: number;
  name: string;
  summary: string;
  uservisible?: boolean;
  // fileurl fields are ignored on purpose: only page links are kept.
  modules?: { name: string; modname: string; url?: string; uservisible?: boolean }[];
}

interface RawForum {
  id: number;
  course: number;
  type: string;
}

interface RawDiscussion {
  discussion: number;
  subject: string;
  message: string;
  created: number;
  userfullname?: string;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Plain text from Moodle HTML. Shown as text by React and sent as text to the LLM. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<(br|\/p|\/div|\/li|\/h\d)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (match, entity: string) => {
      if (entity.startsWith('#')) {
        const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        return Number.isNaN(code) ? match : String.fromCodePoint(code);
      }
      return ENTITIES[entity.toLowerCase()] ?? match;
    })
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}

/** "2026F_LIBE120_SEC03" becomes "LIBE 120 (SEC03)". Unknown formats stay as they are. */
export function readableCode(shortname: string): { code: string; label: string } {
  const match = shortname.match(/([A-Za-z]{2,5})\s?(\d{2,4})(?:_([A-Za-z0-9_]+))?/);
  if (!match || !/[A-Za-z]{2}/.test(match[1])) return { code: shortname, label: shortname };
  const code = `${match[1].toUpperCase()} ${match[2]}`;
  const section = match[3] && !/ALL/i.test(match[3]) ? ` (${match[3]})` : '';
  return { code, label: `${code}${section}` };
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

/** Moodle weekly sections are named like "26 October - 1 November". */
export function isCurrentWeekName(name: string, now = new Date()): boolean {
  const match = name.toLowerCase().match(/(\d{1,2})\s+([a-z]+)\s*-\s*(\d{1,2})\s+([a-z]+)/);
  if (!match) return false;
  const startMonth = MONTHS.indexOf(match[2]);
  const endMonth = MONTHS.indexOf(match[4]);
  if (startMonth < 0 || endMonth < 0) return false;
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  // Checks neighbouring years so weeks across New Year still match.
  return [-1, 0].some((offset) => {
    const year = now.getFullYear() + offset;
    const start = new Date(year, startMonth, Number(match[1])).getTime();
    const end = new Date(endMonth < startMonth ? year + 1 : year, endMonth, Number(match[3])).getTime();
    return day >= start && day <= end;
  });
}

function isoDate(seconds: number): string {
  const date = new Date(seconds * 1000);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

async function fetchSections(courseId: number): Promise<CourseSection[]> {
  const base = moodleBaseUrl();
  const raw = await call<RawSection[]>('core_course_get_contents', { courseid: String(courseId) }).catch(() => []);
  return raw
    .filter((section) => section.uservisible !== false)
    .map((section) => ({
      number: section.section,
      name: section.name,
      summary: htmlToText(section.summary ?? ''),
      url: `${base}/course/view.php?id=${courseId}&section=${section.section}`,
      isCurrentWeek: isCurrentWeekName(section.name),
      materials: (section.modules ?? [])
        .filter((module) => module.uservisible !== false)
        .map((module) => ({ name: module.name, type: module.modname, url: module.url })),
    }));
}

async function fetchAnnouncements(forumId: number, courseCode: string): Promise<RawAnnouncement[]> {
  const base = moodleBaseUrl();
  const raw = await call<{ discussions?: RawDiscussion[] }>('mod_forum_get_forum_discussions', {
    forumid: String(forumId),
    perpage: ANNOUNCEMENTS_PER_COURSE,
  }).catch(() => ({ discussions: [] as RawDiscussion[] }));
  // Announcement forums are written by course staff; only their name is kept.
  return (raw.discussions ?? []).map((item) => ({
    id: item.discussion,
    courseCode,
    author: item.userfullname,
    title: htmlToText(item.subject),
    date: isoDate(item.created),
    text: htmlToText(item.message ?? ''),
    url: `${base}/mod/forum/discuss.php?d=${item.discussion}`,
  }));
}

async function fetchPackages(): Promise<CoursePackage[]> {
  const snapshot = await getSnapshot();
  const courses = snapshot.courses.filter((course): course is typeof course & { id: number } => course.id != null);

  const forumParams: Record<string, string> = {};
  courses.forEach((course, index) => {
    forumParams[`courseids[${index}]`] = String(course.id);
  });
  const forums = courses.length
    ? await call<RawForum[]>('mod_forum_get_forums_by_courses', forumParams).catch(() => [] as RawForum[])
    : [];
  // Announcement forums only. Student discussion forums are never read.
  const newsForums = forums.filter((forum) => forum.type === 'news');

  const packages: CoursePackage[] = [];
  for (let start = 0; start < courses.length; start += PARALLEL_COURSES) {
    const batch = courses.slice(start, start + PARALLEL_COURSES);
    packages.push(
      ...(await Promise.all(
        batch.map(async (course) => {
          const { label } = readableCode(course.code);
          const [sections, announcementLists] = await Promise.all([
            fetchSections(course.id),
            Promise.all(
              newsForums
                .filter((forum) => forum.course === course.id)
                .map((forum) => fetchAnnouncements(forum.id, label)),
            ),
          ]);
          return {
            id: course.id,
            shortname: course.code,
            code: label,
            name: course.name,
            url: `${moodleBaseUrl()}/course/view.php?id=${course.id}`,
            sections,
            announcements: announcementLists.flat().sort((a, b) => b.date.localeCompare(a.date)),
            upcoming: snapshot.upcoming.filter((item) => item.courseCode === course.code),
          };
        }),
      )),
    );
  }
  return packages;
}

/** Course contacts by course id. Only names are read; empty if the function is closed. */
export async function getTeachers(courseIds: number[]): Promise<Map<number, string>> {
  const cached = teacherCache.get('teachers');
  if (cached) return cached;
  const teachers = new Map<number, string>();
  try {
    const raw = await call<{ courses?: { id: number; contacts?: { fullname: string }[] }[] }>(
      'core_course_get_courses_by_field',
      { field: 'ids', value: courseIds.join(',') },
    );
    for (const course of raw.courses ?? []) {
      const names = (course.contacts ?? []).map((contact) => contact.fullname);
      if (names.length) teachers.set(course.id, names.join(', '));
    }
  } catch {
    // Optional detail: the page works without it.
  }
  teacherCache.set('teachers', teachers, CACHE_TTL_MS);
  return teachers;
}

/** Null when Moodle isn't connected. Individual functions may fail and leave parts empty. */
export async function getCoursePackages(): Promise<CoursePackage[] | null> {
  const cached = cache.get('packages');
  if (cached) return cached;
  inFlight ??= fetchPackages()
    .then((packages) => {
      cache.set('packages', packages, CACHE_TTL_MS);
      return packages;
    })
    .finally(() => {
      inFlight = null;
    });
  try {
    return await inFlight;
  } catch {
    return null;
  }
}
