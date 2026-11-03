import type { CampusEvent, Course, FaqEntry, Localized, Rule, SampleAnnouncement, SampleAssignment } from '../types';
import announcementsFile from './announcements.json';
import assignmentsFile from './assignments.json';
import coursesFile from './courses.json';
import departmentsFile from './departments.json';
import eventsFile from './events.json';
import faqFile from './faq.json';
import rulesFile from './rules.json';
import teduCalendarFile from './tedu-calendar.json';

/** Official academic calendar, taken from the university's published page. */
export const teduCalendar = teduCalendarFile.items as { name: string; start: string; end: string; type: string }[];
export const rules = rulesFile.items as Rule[];
export const courses = coursesFile.items as Course[];
export const departments = departmentsFile.items as { id: string; name: Localized }[];
export const events = eventsFile.items as CampusEvent[];
export const faq = faqFile.items as FaqEntry[];
export const sampleAnnouncements = announcementsFile.items as SampleAnnouncement[];
export const assignments = assignmentsFile.items as SampleAssignment[];

/** Sample deadlines are relative to today so the demo never looks empty. */
export function dateFromOffset(offsetDays: number, from = new Date()): string {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offsetDays);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
