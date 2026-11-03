import type {
  ChatRequest,
  ChatResponse,
  HealthResponse,
  Announcement,
  Assignment,
  CalendarResponse,
  CourseDetail,
  CourseListItem,
  Importance,
  Language,
  MoodleProfile,
  MoodleStatus,
  Sourced,
  StudyExplanationResponse,
  StudyHintResponse,
  StudyPracticeResponse,
  StudySample,
  StudyStartRequest,
  StudyStartResponse,
  UpcomingItem,
} from '@teddy/shared';

// The only module that talks to the network, and only to our own backend.
// Longer than the server's own limits, so the UI can never wait forever.
const REQUEST_TIMEOUT_MS = 45_000;

export class ApiError extends Error {
  constructor(readonly status: number) {
    super(`Request failed: ${status}`);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) throw new ApiError(res.status);
  return (await res.json()) as T;
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
}

export const api = {
  calendar: (language: Language) => request<CalendarResponse>(`/calendar?lang=${language}`),
  health: () => request<HealthResponse>('/health'),
  upcoming: (language: Language, days: 7 | 30 = 7) =>
    request<Sourced<UpcomingItem[]>>(`/data/upcoming?lang=${language}&days=${days}`),
  courses: (language: Language) => request<Sourced<CourseListItem[]>>(`/courses?lang=${language}`),
  course: (id: number, language: Language) => request<Sourced<CourseDetail>>(`/courses/${id}?lang=${language}`),
  moodleStatus: () => request<MoodleStatus>('/moodle/status'),
  moodleProfile: () => request<MoodleProfile | null>('/moodle/profile'),
  announcements: (language: Language, filters: { courseId?: number; importance?: Importance } = {}) => {
    const query = new URLSearchParams({ lang: language });
    if (filters.courseId != null) query.set('courseId', String(filters.courseId));
    if (filters.importance) query.set('importance', filters.importance);
    return request<Sourced<Announcement[]>>(`/announcements?${query}`);
  },
  assignments: (language: Language, importance?: Importance) => {
    const query = new URLSearchParams({ lang: language });
    if (importance) query.set('importance', importance);
    return request<Sourced<Assignment[]>>(`/assignments?${query}`);
  },
  moodleRefresh: () => post<MoodleStatus>('/refresh'),
  chat: (body: ChatRequest) => post<ChatResponse>('/ai/chat', body),
  studySamples: (courseCode: string, language: Language) =>
    request<StudySample[]>(`/ai/study/samples?course=${encodeURIComponent(courseCode)}&lang=${language}`),
  studyStart: (body: StudyStartRequest) => post<StudyStartResponse>('/ai/study/start', body),
  studyHint: (id: string) => post<StudyHintResponse>(`/ai/study/${id}/hint`),
  studyExplanation: (id: string) => post<StudyExplanationResponse>(`/ai/study/${id}/explanation`, { confirmed: true }),
  studyPractice: (id: string) => post<StudyPracticeResponse>(`/ai/study/${id}/practice`),
};
