import {
  courses as sampleCourses,
  assignments as sampleAssignments,
  dateFromOffset,
  sampleAnnouncements,
} from '@teddy/shared/data';
import type {
  Announcement,
  Assignment,
  CourseDetail,
  CourseListItem,
  CoursePackage,
  DataSource,
  Language,
} from '@teddy/shared';
import { getCoursePackages, getTeachers, isCurrentWeekName, isSameWeek, parseWeekRange, readableCode, type WeekRange } from './coursePackages';
import { aiClassifier } from './importance/aiClassifier';
import { announcementLevel, dateLevel, higher, keywordLevel } from './importance/rules';
import { getSnapshot } from './moodleService';

type Snapshot = Awaited<ReturnType<typeof getSnapshot>>;

// One entry point for the course pages: Moodle when connected, sample data in the same shape otherwise.

const SUMMARY_CHARS = 200;
const SAMPLE_ID_BASE = 101;
const CURRENT_SAMPLE_WEEK = 1;

function summarize(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > SUMMARY_CHARS ? `${flat.slice(0, SUMMARY_CHARS).trimEnd()}…` : flat;
}

function classifyAnnouncement(title: string, message: string, postedAt: string, language: Language) {
  const { level, reason } = announcementLevel(`${title} ${message}`, postedAt, language);
  return { importance: level, importanceReason: reason, importanceSource: 'rules' as const };
}

/** Moodle announcements may have an AI verdict; the date rule still applies on top of it. */
function classifyMoodleAnnouncement(id: string, courseCode: string, title: string, message: string, postedAt: string, language: Language) {
  const ai = aiClassifier.lookup({ id, courseCode, title, message, postedAt }, language);
  if (!ai) return classifyAnnouncement(title, message, postedAt, language);
  const { level, reason } = announcementLevel(`${title} ${message}`, postedAt, language, Date.now(), ai);
  return { importance: level, importanceReason: reason, importanceSource: 'ai' as const };
}

function classifyAssignment(name: string, dueAt: string | null, language: Language) {
  // A passed deadline needs no action, whatever its name says.
  const byDate = dateLevel(dueAt, language);
  const isPast = dueAt != null && new Date(dueAt).getTime() < Date.now();
  const { level, reason } = isPast ? byDate : higher(byDate, keywordLevel(name, language));
  return { importance: level, importanceReason: reason };
}

// ---- Moodle

/** Moodle keeps "LIBE120_ALL_SECTIONS" and "LIBE120_SEC03" apart; students see one course. */
function groupPackages(packages: CoursePackage[]): CoursePackage[][] {
  const groups = new Map<string, CoursePackage[]>();
  for (const item of packages) {
    const { code } = readableCode(item.shortname);
    groups.set(code, [...(groups.get(code) ?? []), item]);
  }
  return [...groups.values()];
}

const primaryOf = (group: CoursePackage[]) => group.find((item) => !/ALL/i.test(item.shortname)) ?? group[0];

/** Primary first, so its titles and links win when the same thing appears in both courses. */
function primaryFirst(group: CoursePackage[]): CoursePackage[] {
  const primary = primaryOf(group);
  return [primary, ...group.filter((item) => item !== primary)];
}

/** "Exam & Project", "exam and project" and "Exam  and Project." are one title. */
function announcementTitleKey(title: string): string {
  return title
    .toLocaleLowerCase('en')
    .replace(/\band\b/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function announcementKey(title: string, text: string): string {
  return `${announcementTitleKey(title)}|${text.replace(/\s+/g, ' ').trim()}`;
}

export function packagesForCourse(courseId: number, packages: CoursePackage[]): CoursePackage[] {
  return groupPackages(packages).find((group) => primaryOf(group).id === courseId) ?? [];
}

function listItem(group: CoursePackage[]): CourseListItem {
  const primary = primaryOf(group);
  const { code } = readableCode(primary.shortname);
  // Most Moodle full names here are the raw short name, which adds nothing.
  return { id: primary.id, code, name: /_/.test(primary.name) ? code : primary.name };
}

function moodleAnnouncements(group: CoursePackage[], language: Language): Announcement[] {
  const { id, code, name } = listItem(group);
  // The same post is often published to both the section and the all-sections course.
  const seen = new Set<string>();
  const isNew = (key: string) => !seen.has(key) && Boolean(seen.add(key));
  return primaryFirst(group)
    .flatMap((item) => item.announcements)
    .filter((item) => isNew(announcementKey(item.title, item.text)))
    .map((item) => ({
      id: String(item.id),
      courseId: id,
      courseCode: code,
      courseName: name,
      title: item.title,
      message: item.text,
      summary: summarize(item.text),
      postedAt: item.date,
      author: item.author,
      moodleUrl: item.url,
      ...classifyMoodleAnnouncement(String(item.id), code, item.title, item.text, item.date, language),
    }))
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

function moodleAssignments(group: CoursePackage[], snapshot: Snapshot, language: Language): Assignment[] {
  const { id, code } = listItem(group);
  const primary = primaryOf(group);
  const shortnames = new Set(group.map((item) => item.shortname));
  const assignments: Assignment[] = snapshot.assignments
    .filter((item) => shortnames.has(item.courseCode))
    .map((item) => ({
      id: `assign-${item.id}`,
      courseId: id,
      courseCode: code,
      name: item.name,
      dueAt: item.dueAt,
      moodleUrl: item.url,
      kind: 'assignment' as const,
      ...classifyAssignment(item.name, item.dueAt, language),
    }));
  for (const event of snapshot.upcoming) {
    if (!shortnames.has(event.courseCode) || event.id.startsWith('assign-')) continue;
    const dueAt = event.dueAt ?? null;
    assignments.push({
      id: event.id,
      courseId: id,
      courseCode: code,
      name: event.title,
      dueAt,
      moodleUrl: event.url ?? primary.url,
      kind: event.type,
      ...classifyAssignment(event.title, dueAt, language),
    });
  }
  return assignments;
}

async function moodleDetail(group: CoursePackage[], language: Language): Promise<CourseDetail> {
  const { id, code, name } = listItem(group);
  const primary = primaryOf(group);
  const snapshot = await getSnapshot();
  const shortnames = new Set(group.map((item) => item.shortname));
  const teachers = await getTeachers(snapshot.courses.flatMap((course) => (course.id == null ? [] : [course.id])));

  // Same week in both Moodle courses becomes one section under the primary course's title.
  const merged: (CourseDetail['sections'][number] & { order: number; range: WeekRange | null })[] = [];
  for (const section of primaryFirst(group).flatMap((item) => item.sections)) {
    const range = parseWeekRange(section.name);
    const existing = merged.find((other) =>
      range && other.range ? isSameWeek(range, other.range) : !range && !other.range && other.title === section.name,
    );
    const target =
      existing ?? { title: section.name, summary: section.summary, isCurrentWeek: false, items: [], order: section.number, range };
    if (!existing) merged.push(target);
    for (const material of section.materials) {
      const item = { name: material.name, type: material.type, url: material.url ?? '' };
      // Items without a link can only be told apart by name.
      const isDuplicate = target.items.some((other) => (item.url ? other.url === item.url : !other.url && other.name === item.name));
      if (!isDuplicate) target.items.push(item);
    }
    if (!target.summary) target.summary = section.summary;
    target.isCurrentWeek ||= section.isCurrentWeek;
  }

  // Weeks a day apart can leave two sections marked; the one whose shown title holds today wins.
  const marked = merged.filter((section) => section.isCurrentWeek);
  const currentWeek = marked.find((section) => isCurrentWeekName(section.title)) ?? marked[0];
  for (const section of merged) section.isCurrentWeek = section === currentWeek;

  const sections = merged
    .sort((a, b) => a.order - b.order)
    .filter((section) => section.isCurrentWeek || section.items.length > 0 || section.summary)
    .map(({ order: _order, range: _range, ...section }) => section);

  const current = sections.find((section) => section.isCurrentWeek);

  const assignments = moodleAssignments(group, snapshot, language);

  return {
    id,
    code,
    name,
    teacher: teachers.get(primary.id) ?? group.map((item) => teachers.get(item.id)).find(Boolean),
    moodleUrl: primary.url,
    currentWeek: current ? { title: current.title, summary: current.summary } : undefined,
    sections,
    announcements: moodleAnnouncements(group, language),
    assignments,
  };
}

// ---- Sample data

const sampleId = (index: number) => SAMPLE_ID_BASE + index;

function sampleDueAt(offsetDays: number): string {
  return new Date(`${dateFromOffset(offsetDays)}T23:59:00`).toISOString();
}

function sampleCourseAnnouncements(code: string, id: number, name: string, language: Language): Announcement[] {
  return sampleAnnouncements
    .filter((item) => item.courseCode === code)
    .map((item) => ({
      id: item.id,
      courseId: id,
      courseCode: code,
      courseName: name,
      title: item.title[language],
      message: item.message[language],
      summary: summarize(item.message[language]),
      postedAt: dateFromOffset(item.offsetDays),
      author: item.author,
      moodleUrl: '',
      ...classifyAnnouncement(item.title[language], item.message[language], dateFromOffset(item.offsetDays), language),
    }));
}

function sampleCourseAssignments(index: number, language: Language): Assignment[] {
  const course = sampleCourses[index];
  const id = sampleId(index);
  const assignments: Assignment[] = [
    ...sampleAssignments
      .filter((item) => item.courseCode === course.code)
      .map((item) => {
        const dueAt = sampleDueAt(item.offsetDays);
        return {
          id: item.id,
          courseId: id,
          courseCode: course.code,
          name: item.title[language],
          dueAt,
          moodleUrl: '',
          kind: 'assignment' as const,
          ...classifyAssignment(item.title[language], dueAt, language),
        };
      }),
    ...course.exams.map((exam) => {
      const dueAt = sampleDueAt(exam.offsetDays);
      return {
        id: exam.id,
        courseId: id,
        courseCode: course.code,
        name: exam.name[language],
        dueAt,
        moodleUrl: '',
        kind: 'exam' as const,
        ...classifyAssignment(exam.name[language], dueAt, language),
      };
    }),
  ];
  return assignments;
}

function sampleDetail(index: number, language: Language): CourseDetail {
  const course = sampleCourses[index];
  const id = sampleId(index);
  const name = course.name[language];
  const week = language === 'tr' ? 'Hafta' : 'Week';
  const slides = language === 'tr' ? 'slaytları' : 'slides';
  const sections = course.topics.map((topic, position) => ({
    title: `${week} ${position + 1}: ${topic[language]}`,
    summary: topic[language],
    isCurrentWeek: position === CURRENT_SAMPLE_WEEK,
    items: [{ name: `${topic[language]} ${slides}`, type: 'resource', url: '' }],
  }));
  const current = sections[CURRENT_SAMPLE_WEEK];
  return {
    id,
    code: course.code,
    name,
    teacher: course.instructor,
    moodleUrl: '',
    currentWeek: current && { title: current.title, summary: current.summary },
    sections,
    announcements: sampleCourseAnnouncements(course.code, id, name, language).sort((a, b) =>
      b.postedAt.localeCompare(a.postedAt),
    ),
    assignments: sampleCourseAssignments(index, language),
  };
}

// ---- Public API

/** Called by the page routes only, so chat questions never spend quota on this. */
export function classifyInBackground(source: DataSource, announcements: Announcement[]): void {
  if (source === 'moodle') void aiClassifier.schedule(announcements);
}

export async function listCourses(language: Language): Promise<{ source: DataSource; data: CourseListItem[] }> {
  const packages = await getCoursePackages();
  if (packages) return { source: 'moodle', data: groupPackages(packages).map(listItem) };
  return {
    source: 'sample',
    data: sampleCourses.map((course, index) => ({ id: sampleId(index), code: course.code, name: course.name[language] })),
  };
}

export async function getCourseDetail(courseId: number, language: Language): Promise<CourseDetail | null> {
  const packages = await getCoursePackages();
  if (packages) {
    const group = packagesForCourse(courseId, packages);
    return group.length ? moodleDetail(group, language) : null;
  }
  const index = courseId - SAMPLE_ID_BASE;
  return sampleCourses[index] ? sampleDetail(index, language) : null;
}

export async function listAnnouncements(language: Language): Promise<{ source: DataSource; data: Announcement[] }> {
  const packages = await getCoursePackages();
  const data = packages
    ? groupPackages(packages).flatMap((group) => moodleAnnouncements(group, language))
    : sampleCourses.flatMap((course, index) =>
        sampleCourseAnnouncements(course.code, sampleId(index), course.name[language], language),
      );
  data.sort((a, b) => b.postedAt.localeCompare(a.postedAt));
  return { source: packages ? 'moodle' : 'sample', data };
}

export async function listAssignments(language: Language): Promise<{ source: DataSource; data: Assignment[] }> {
  const packages = await getCoursePackages();
  if (!packages) {
    return { source: 'sample', data: sampleCourses.flatMap((_course, index) => sampleCourseAssignments(index, language)) };
  }
  const snapshot = await getSnapshot();
  return { source: 'moodle', data: groupPackages(packages).flatMap((group) => moodleAssignments(group, snapshot, language)) };
}
