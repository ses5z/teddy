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
import { getCoursePackages, getTeachers, readableCode } from './coursePackages';
import { dateLevel, higher, keywordLevel } from './importance/rules';
import { getSnapshot } from './moodleService';

// One entry point for the course pages: Moodle when connected, sample data in the same shape otherwise.

const SUMMARY_CHARS = 200;
const SAMPLE_ID_BASE = 101;
const CURRENT_SAMPLE_WEEK = 1;

function summarize(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > SUMMARY_CHARS ? `${flat.slice(0, SUMMARY_CHARS).trimEnd()}…` : flat;
}

function classifyAnnouncement(title: string, message: string, language: Language) {
  const { level, reason } = keywordLevel(`${title} ${message}`, language);
  return { importance: level, importanceReason: reason, importanceSource: 'rules' as const };
}

function classifyAssignment(name: string, dueAt: string | null, language: Language) {
  const { level, reason } = higher(dateLevel(dueAt, language), keywordLevel(name, language));
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
  return group
    .flatMap((item) => item.announcements)
    .filter((item) => isNew(`${item.title}|${item.text}`))
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
      ...classifyAnnouncement(item.title, item.text, language),
    }))
    .sort((a, b) => b.postedAt.localeCompare(a.postedAt));
}

async function moodleDetail(group: CoursePackage[], language: Language): Promise<CourseDetail> {
  const { id, code, name } = listItem(group);
  const primary = primaryOf(group);
  const snapshot = await getSnapshot();
  const shortnames = new Set(group.map((item) => item.shortname));
  const teachers = await getTeachers(snapshot.courses.flatMap((course) => (course.id == null ? [] : [course.id])));

  // Same week in both Moodle courses becomes one section.
  const byTitle = new Map<string, CourseDetail['sections'][number] & { order: number }>();
  for (const section of group.flatMap((item) => item.sections)) {
    const existing = byTitle.get(section.name);
    const items = section.materials.map((material) => ({
      name: material.name,
      type: material.type,
      url: material.url ?? '',
    }));
    if (existing) {
      existing.items.push(...items.filter((item) => !existing.items.some((other) => other.url === item.url)));
      if (!existing.summary) existing.summary = section.summary;
    } else {
      byTitle.set(section.name, { title: section.name, summary: section.summary, isCurrentWeek: section.isCurrentWeek, items, order: section.number });
    }
  }
  const sections = [...byTitle.values()]
    .sort((a, b) => a.order - b.order)
    .filter((section) => section.isCurrentWeek || section.items.length > 0 || section.summary)
    .map(({ order: _order, ...section }) => section);

  const current = sections.find((section) => section.isCurrentWeek);

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
      ...classifyAnnouncement(item.title[language], item.message[language], language),
    }));
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
    assignments,
  };
}

// ---- Public API

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
