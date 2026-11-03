// Types shared by client and server. Keep API contracts here.

/** official: TED University's published academic calendar */
export type DataSource = 'moodle' | 'sample' | 'official';

export interface HealthResponse {
  status: 'ok';
  aiMode: 'demo' | 'live';
  moodleConfigured: boolean;
}

export type Language = 'tr' | 'en';
export type Localized = Record<Language, string>;

/** Wraps data so the UI can always show where it came from. */
export interface Sourced<T> {
  source: DataSource;
  data: T;
}

export interface UpcomingItem {
  id: string;
  type: 'assignment' | 'exam';
  title: string;
  courseCode: string;
  /** ISO date, YYYY-MM-DD */
  date: string;
  /** Moodle page, when the item comes from Moodle */
  url?: string;
  /** Exact deadline as ISO timestamp, when known */
  dueAt?: string;
}

export interface ChatRequest {
  question: string;
  language: Language;
  /** Set when the chat was opened from a course page */
  courseId?: number;
}

export interface ChatSource {
  label: string;
  /** In-app route with more detail */
  link?: string;
  /** External Moodle page */
  url?: string;
}

export interface ChatResponse {
  answer: string;
  source: ChatSource | null;
  /** false when TEDDY does not know and redirects the student */
  confident: boolean;
  dataSource: DataSource;
}

// Sample data shapes (shared/data/*.json)
export interface CalendarEntry {
  id: string;
  title: Localized;
  start: string;
  end?: string;
}

export interface Rule {
  id: string;
  article: string;
  title: Localized;
  summary: Localized;
}

export interface Course {
  code: string;
  name: Localized;
  instructor: string;
  officeHours: Localized;
  exams: { id: string; name: Localized; offsetDays: number }[];
  topics: Localized[];
}

export interface CampusEvent {
  id: string;
  title: Localized;
  organizer: string;
  location: Localized;
  offsetDays: number;
  time: string;
}

export interface SampleAssignment {
  id: string;
  courseCode: string;
  title: Localized;
  offsetDays: number;
}

export interface FaqEntry {
  id: string;
  question: Localized;
  answer: Localized;
  source: Localized;
  link?: string;
  /** Matched after normalization: lowercase, no Turkish diacritics */
  keywords: string[];
}

// Study Mode. The server releases a plan piece by piece, so an answer
// never reaches the browser before the student asks for it.
export interface StudySample {
  id: string;
  question: string;
}

export interface StudyStartRequest {
  courseCode: string;
  question: string;
  language: Language;
}

export interface StudyHintResponse {
  hint: string;
  hintNumber: number;
  totalHints: number;
}

export interface StudyStartResponse extends StudyHintResponse {
  sessionId: string;
  topic: string;
  homeworkReminder: boolean;
}

export interface StudyPractice {
  question: string;
  answer: string;
}

export interface StudyExplanationResponse {
  steps: string[];
  practice: StudyPractice | null;
}

export interface StudyPracticeResponse {
  practice: StudyPractice | null;
}

// Moodle
export type MoodleProblem = 'not_configured' | 'invalid_token' | 'unreachable';

export interface MoodleStatus {
  connected: boolean;
  problem?: MoodleProblem;
  /** ISO timestamp of the last successful fetch */
  lastSync?: string;
  /** Which Moodle functions worked on their last call */
  functions?: Record<string, 'ok' | 'failed'>;
}

export interface CourseSummary {
  /** Moodle course id; sample courses have none */
  id?: number;
  code: string;
  name: string;
}

export interface MoodleProfile {
  name: string;
  courses: CourseSummary[];
}

// Moodle course packages: everything TEDDY knows about one course.
export interface CourseMaterial {
  name: string;
  type: string;
  url?: string;
}

export interface CourseSection {
  number: number;
  name: string;
  summary: string;
  url: string;
  isCurrentWeek: boolean;
  materials: CourseMaterial[];
}

/** One announcement as read from Moodle, before course merging and classification. */
export interface RawAnnouncement {
  id: number;
  courseCode: string;
  author?: string;
  title: string;
  /** ISO date, YYYY-MM-DD */
  date: string;
  text: string;
  url: string;
}

export interface CoursePackage {
  id: number;
  shortname: string;
  /** Readable code, e.g. "LIBE 120" */
  code: string;
  name: string;
  url: string;
  sections: CourseSection[];
  announcements: RawAnnouncement[];
  upcoming: UpcomingItem[];
}

// Course detail and announcements API
export type Importance = 'critical' | 'important' | 'info';

export interface Announcement {
  /** Moodle discussion id */
  id: string;
  courseId: number;
  courseCode: string;
  courseName: string;
  title: string;
  /** Plain text */
  message: string;
  /** First ~200 characters */
  summary: string;
  postedAt: string;
  /** Instructor or staff name only */
  author?: string;
  moodleUrl: string;
  importance: Importance;
  importanceReason: string;
  importanceSource: 'ai' | 'rules';
}

export interface Assignment {
  id: string;
  courseId: number;
  courseCode: string;
  name: string;
  dueAt: string | null;
  moodleUrl: string;
  kind: 'assignment' | 'exam';
  importance: Importance;
  importanceReason: string;
}

export interface CourseListItem {
  id: number;
  code: string;
  name: string;
}

export interface CourseDetail {
  id: number;
  code: string;
  name: string;
  teacher?: string;
  moodleUrl: string;
  currentWeek?: { title: string; summary: string };
  sections: {
    title: string;
    summary: string;
    isCurrentWeek: boolean;
    items: { name: string; type: string; url: string }[];
  }[];
  announcements: Announcement[];
  assignments: Assignment[];
}

export interface SampleAnnouncement {
  id: string;
  courseCode: string;
  author: string;
  title: Localized;
  message: Localized;
  /** Days from today; negative means in the past */
  offsetDays: number;
}

// Academic calendar API
export type CalendarEntryType =
  | 'holiday'
  | 'half_day'
  | 'exam'
  | 'registration'
  | 'deadline'
  | 'special'
  | 'moodle'
  | 'academic';

export interface CalendarApiEntry {
  id: string;
  name: string;
  /** Inclusive, YYYY-MM-DD in Europe/Istanbul */
  start: string;
  end: string;
  type: CalendarEntryType;
  source: 'tedu' | 'moodle';
  sourceUrl: string;
  lastFetchedAt: string;
}

export interface CalendarResponse {
  entries: CalendarApiEntry[];
  /** Official calendar page and when its copy was taken */
  sourceUrl: string;
  lastFetchedAt: string;
}
