import type { CourseSummary, MoodleProblem, MoodleStatus, UpcomingItem } from '@teddy/shared';
import { TtlCache } from './cache';

// Read-only by construction: nothing outside this list can ever be called.
// Only the token owner's own data. Forums: announcement (news) forums only.
// No participants, grades, student discussions or other students.
const ALLOWED_FUNCTIONS = new Set([
  'core_webservice_get_site_info',
  'core_enrol_get_users_courses',
  'core_calendar_get_action_events_by_timesort',
  'mod_assign_get_assignments',
  'core_course_get_contents',
  'mod_forum_get_forums_by_courses',
  'mod_forum_get_forum_discussions',
  'core_course_get_courses_by_field',
]);

const CACHE_TTL_MS = 10 * 60 * 1000;
const FAILURE_TTL_MS = 30 * 1000;
const TIMEOUT_MS = 8000;
const LOOKAHEAD_DAYS = 30;
const DAY_SECONDS = 24 * 60 * 60;

export class MoodleError extends Error {
  constructor(readonly problem: MoodleProblem) {
    super(`Moodle unavailable: ${problem}`);
    this.name = 'MoodleError';
  }
}

export interface MoodleSnapshot {
  name: string;
  userId: number;
  courses: CourseSummary[];
  upcoming: UpcomingItem[];
  /** Every assignment with a due date, past ones too */
  assignments: { id: number; courseCode: string; name: string; dueAt: string; url: string }[];
  fetchedAt: string;
}

type CacheValue = MoodleSnapshot | MoodleError;
const cache = new TtlCache<CacheValue>();
let inFlight: Promise<MoodleSnapshot> | null = null;

const functionStatus: Record<string, 'ok' | 'failed'> = {};

/** Moodle base URL without a trailing slash, used for page links. Never carries the token. */
export function moodleBaseUrl(): string {
  return (process.env.MOODLE_URL ?? '').replace(/\/+$/, '');
}

function endpoint(): string {
  const { MOODLE_URL, MOODLE_TOKEN } = process.env;
  if (!MOODLE_URL || !MOODLE_TOKEN) throw new MoodleError('not_configured');
  let url: URL;
  try {
    url = new URL(MOODLE_URL);
  } catch {
    throw new MoodleError('not_configured');
  }
  // Never send the token over plain HTTP, except to this machine.
  const isLocal = url.hostname === '127.0.0.1' || url.hostname === 'localhost';
  if (url.protocol !== 'https:' && !isLocal) throw new MoodleError('not_configured');
  return `${MOODLE_URL.replace(/\/+$/, '')}/webservice/rest/server.php`;
}

const TOKEN_ERRORS = new Set(['invalidtoken', 'accessexception', 'invalidlogin']);

export async function call<T>(wsfunction: string, params: Record<string, string> = {}): Promise<T> {
  if (!ALLOWED_FUNCTIONS.has(wsfunction)) throw new Error('Moodle function not allowed');
  const url = endpoint();

  let data: unknown;
  try {
    // POST keeps the token out of URLs. Redirects are refused so it can't follow one elsewhere.
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        wstoken: process.env.MOODLE_TOKEN as string,
        wsfunction,
        moodlewsrestformat: 'json',
        ...params,
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error('bad status');
    data = await res.json();
  } catch {
    // The original error is dropped on purpose; it could contain request details.
    functionStatus[wsfunction] = 'failed';
    throw new MoodleError('unreachable');
  }

  const errorCode = (data as { errorcode?: string } | null)?.errorcode;
  functionStatus[wsfunction] = errorCode ? 'failed' : 'ok';
  if (errorCode) throw new MoodleError(TOKEN_ERRORS.has(errorCode) ? 'invalid_token' : 'unreachable');
  return data as T;
}

function isoDate(seconds: number): string {
  const date = new Date(seconds * 1000);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

interface RawCourse {
  id: number;
  shortname: string;
  fullname: string;
}

interface RawAssignments {
  courses?: { id: number; assignments?: { id: number; cmid: number; name: string; duedate: number }[] }[];
}

interface RawEvents {
  events?: {
    id: number;
    name: string;
    timesort: number;
    modulename?: string;
    instance?: number;
    course?: { id: number };
    url?: string;
  }[];
}

async function fetchSnapshot(): Promise<MoodleSnapshot> {
  const site = await call<{ userid: number; firstname: string }>('core_webservice_get_site_info');
  const rawCourses = await call<RawCourse[]>('core_enrol_get_users_courses', { userid: String(site.userid) });

  const now = Math.floor(Date.now() / 1000);
  const until = now + LOOKAHEAD_DAYS * DAY_SECONDS;
  const codeById = new Map(rawCourses.map((course) => [course.id, course.shortname]));

  const assignmentParams: Record<string, string> = {};
  rawCourses.forEach((course, index) => {
    assignmentParams[`courseids[${index}]`] = String(course.id);
  });

  // Sites may disable one of these. Either alone is still useful.
  const [assignmentsResult, eventsResult] = await Promise.allSettled([
    rawCourses.length
      ? call<RawAssignments>('mod_assign_get_assignments', assignmentParams)
      : Promise.resolve<RawAssignments>({}),
    call<RawEvents>('core_calendar_get_action_events_by_timesort', {
      timesortfrom: String(now),
      timesortto: String(until),
      limitnum: '50',
    }),
  ]);
  if (assignmentsResult.status === 'rejected' && eventsResult.status === 'rejected') {
    throw assignmentsResult.reason;
  }

  const upcoming: UpcomingItem[] = [];
  const allAssignments: MoodleSnapshot['assignments'] = [];
  const seenAssignments = new Set<number>();

  if (assignmentsResult.status === 'fulfilled') {
    for (const course of assignmentsResult.value.courses ?? []) {
      for (const assignment of course.assignments ?? []) {
        if (assignment.duedate) {
          allAssignments.push({
            id: assignment.id,
            courseCode: codeById.get(course.id) ?? '',
            name: assignment.name,
            dueAt: new Date(assignment.duedate * 1000).toISOString(),
            url: `${moodleBaseUrl()}/mod/assign/view.php?id=${assignment.cmid}`,
          });
        }
        if (assignment.duedate < now || assignment.duedate > until) continue;
        seenAssignments.add(assignment.id);
        upcoming.push({
          id: `assign-${assignment.id}`,
          type: 'assignment',
          title: assignment.name,
          courseCode: codeById.get(course.id) ?? '',
          date: isoDate(assignment.duedate),
          url: `${moodleBaseUrl()}/mod/assign/view.php?id=${assignment.cmid}`,
          dueAt: new Date(assignment.duedate * 1000).toISOString(),
        });
      }
    }
  }

  if (eventsResult.status === 'fulfilled') {
    for (const event of eventsResult.value.events ?? []) {
      if (event.modulename === 'assign' && event.instance && seenAssignments.has(event.instance)) continue;
      const courseCode = (event.course && codeById.get(event.course.id)) ?? '';
      const date = isoDate(event.timesort);
      // Calendar names look like "<assignment> is due", and ids don't always line up.
      const isDuplicate = upcoming.some(
        (item) => item.courseCode === courseCode && item.date === date && event.name.startsWith(item.title),
      );
      if (isDuplicate) continue;
      upcoming.push({
        id: `event-${event.id}`,
        type: event.modulename === 'quiz' ? 'exam' : 'assignment',
        title: event.name,
        courseCode,
        date,
        url: event.url,
        dueAt: new Date(event.timesort * 1000).toISOString(),
      });
    }
  }

  upcoming.sort((a, b) => a.date.localeCompare(b.date));

  return {
    name: site.firstname,
    userId: site.userid,
    courses: rawCourses.map((course) => ({ id: course.id, code: course.shortname, name: course.fullname.trim() })),
    upcoming,
    assignments: allAssignments,
    fetchedAt: new Date().toISOString(),
  };
}

/** Throws MoodleError when Moodle can't be used. Callers fall back to sample data. */
export async function getSnapshot(): Promise<MoodleSnapshot> {
  const cached = cache.get('snapshot');
  if (cached instanceof MoodleError) throw cached;
  if (cached) return cached;

  inFlight ??= fetchSnapshot()
    .then((snapshot) => {
      cache.set('snapshot', snapshot, CACHE_TTL_MS);
      return snapshot;
    })
    .catch((error: unknown) => {
      const failure = error instanceof MoodleError ? error : new MoodleError('unreachable');
      // Short failure cache: a down Moodle shouldn't slow every request by the full timeout.
      cache.set('snapshot', failure, FAILURE_TTL_MS);
      console.warn(failure.message);
      throw failure;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export async function getStatus(): Promise<MoodleStatus> {
  try {
    const snapshot = await getSnapshot();
    return { connected: true, lastSync: snapshot.fetchedAt, functions: { ...functionStatus } };
  } catch (error) {
    return {
      connected: false,
      problem: error instanceof MoodleError ? error.problem : 'unreachable',
      functions: { ...functionStatus },
    };
  }
}

const clearHooks: (() => void)[] = [];

/** Lets other Moodle caches clear together with this one. */
export function onMoodleCacheClear(hook: () => void): void {
  clearHooks.push(hook);
}

export function clearMoodleCache(): void {
  cache.clear();
  clearHooks.forEach((hook) => hook());
}
