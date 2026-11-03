import { dateFromOffset, faq } from '@teddy/shared/data';
import type { ChatRequest, ChatResponse, FaqEntry, Language, StudyStartRequest } from '@teddy/shared';
import { getCourseDetail } from '../courseCatalog';
import { getCoursePackages } from '../coursePackages';
import { getUpcoming } from '../dataService';
import { getSampleEvents } from '../sampleData';
import { matchCourses } from './courseContext';
import { buildDemoStudyPlan } from './demoStudy';
import { hasAny, hasKeyword, normalize } from './textMatch';
import type { AiProvider } from './types';

const ANNOUNCEMENT_WORDS = ['duyuru', 'announcement'];
const WEEK = 7;
const ASSIGNMENT_WORDS = ['odev', 'assignment', 'homework'];
const EVENT_WORDS = ['etkinlik', 'event'];
const EXAM_WORDS = ['sinavlarim', 'sinavim', 'my exam'];

const TEXT = {
  assignmentsHeader: { tr: 'Önümüzdeki 7 gündeki ödevlerin:', en: 'Your assignments in the next 7 days:' },
  assignmentsNone: { tr: 'Önümüzdeki 7 günde ödevin görünmüyor.', en: 'You have no assignments in the next 7 days.' },
  examsHeader: { tr: 'Önümüzdeki 7 gündeki sınavların:', en: 'Your exams in the next 7 days:' },
  examsNone: { tr: 'Önümüzdeki 7 günde sınavın görünmüyor.', en: 'You have no exams in the next 7 days.' },
  eventsHeader: { tr: 'Önümüzdeki 7 gündeki etkinlikler:', en: 'Events in the next 7 days:' },
  eventsNone: { tr: 'Önümüzdeki 7 günde etkinlik görünmüyor.', en: 'There are no events in the next 7 days.' },
  unsure: {
    tr: "Bunu kesin bilmiyorum, Öğrenci İşleri'ne sormanı öneririm.",
    en: "I don't know this for sure. I suggest asking the Student Affairs office.",
  },
  assignmentsSource: { tr: 'Ödevler', en: 'Assignments' },
  examsSource: { tr: 'Dersler', en: 'Courses' },
  eventsSource: { tr: 'Etkinlikler', en: 'Events' },
};

// Multi-word keywords are more specific, so they score higher.
function bestFaq(text: string): { entry: FaqEntry; score: number } | null {
  let best: { entry: FaqEntry; score: number } | null = null;
  for (const entry of faq) {
    const score = entry.keywords
      .filter((keyword) => hasKeyword(text, keyword))
      .reduce((sum, keyword) => sum + keyword.split(' ').length, 0);
    if (score > 0 && (!best || score > best.score)) best = { entry, score };
  }
  return best;
}

function reply(answer: string, label: string, link?: string): ChatResponse {
  return { answer, source: { label, link }, confident: true, dataSource: 'sample' };
}

function formatDay(iso: string, language: Language): string {
  const [year, month, day] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'long' }).format(
    new Date(year, month - 1, day),
  );
}

function bullets(header: string, lines: string[]): string {
  return [header, ...lines.map((line) => `• ${line}`)].join('\n');
}

async function upcomingReply(language: Language, type: 'assignment' | 'exam'): Promise<ChatResponse> {
  const upcoming = await getUpcoming(language, WEEK);
  const items = upcoming.data.filter((item) => item.type === type);
  const isAssignment = type === 'assignment';
  const lines = items.map((item) => `${item.courseCode}: ${item.title} (${formatDay(item.date, language)})`);
  const answer = lines.length
    ? bullets((isAssignment ? TEXT.assignmentsHeader : TEXT.examsHeader)[language], lines)
    : (isAssignment ? TEXT.assignmentsNone : TEXT.examsNone)[language];
  const label = (isAssignment ? TEXT.assignmentsSource : TEXT.examsSource)[language];
  if (upcoming.source === 'moodle') {
    const codes = [...new Set(items.map((item) => item.courseCode))];
    const moodleLabel = codes.length === 1 && codes[0] ? `Moodle – ${codes[0]}` : 'Moodle';
    return { ...reply(answer, moodleLabel), dataSource: 'moodle' };
  }
  return reply(answer, label, isAssignment ? undefined : '/courses');
}

function eventsReply(language: Language): ChatResponse {
  const lines = getSampleEvents(WEEK).map(
    (event) => `${event.title[language]} (${formatDay(dateFromOffset(event.offsetDays), language)}, ${event.time})`,
  );
  const answer = lines.length ? bullets(TEXT.eventsHeader[language], lines) : TEXT.eventsNone[language];
  return reply(answer, TEXT.eventsSource[language], '/events');
}

async function announcementsReply(language: Language, question: string): Promise<ChatResponse> {
  const packages = await getCoursePackages();
  const matched = packages ? matchCourses(question, packages) : [];
  const latest = (matched.length ? matched : (packages ?? []))
    .flatMap((item) => item.announcements)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  if (!latest.length) {
    const none = { tr: 'Moodle\'da duyuru bulamadım.', en: 'I found no announcements on Moodle.' };
    return { answer: none[language], source: null, confident: false, dataSource: packages ? 'moodle' : 'sample' };
  }
  const header = { tr: 'Son duyurular:', en: 'Latest announcements:' };
  const lines = latest.map((item) => `${item.courseCode}: ${item.title} (${formatDay(item.date, language)})`);
  return { ...reply(bullets(header[language], lines), 'Moodle'), dataSource: 'moodle' };
}

/** Demo answer inside a course chat: latest announcements or this week's section. */
async function selectedCourseReply(
  courseId: number,
  language: Language,
  wantsAnnouncements: boolean,
): Promise<ChatResponse | null> {
  const detail = await getCourseDetail(courseId, language);
  if (!detail) return null;
  const dataSource = (await getCoursePackages()) ? 'moodle' : 'sample';
  const label = `${dataSource === 'moodle' ? 'Moodle – ' : ''}${detail.code}`;
  const source = { label, url: detail.moodleUrl || undefined, link: dataSource === 'sample' ? `/courses/${detail.id}` : undefined };
  if (wantsAnnouncements) {
    const lines = detail.announcements.slice(0, 5).map((item) => item.title);
    const none = { tr: `${detail.code} için duyuru bulamadım.`, en: `I found no announcements for ${detail.code}.` };
    if (!lines.length) return { answer: none[language], source, confident: false, dataSource };
    return { answer: bullets(detail.code, lines), source, confident: true, dataSource };
  }
  const week = detail.sections.find((section) => section.isCurrentWeek);
  if (week && (week.summary || week.items.length)) {
    const lines = [week.summary, ...week.items.map((item) => item.name)].filter(Boolean);
    return { answer: bullets(`${detail.code} – ${week.title}:`, lines), source, confident: true, dataSource };
  }
  const none = {
    tr: `${detail.code} için bu haftaya ait içerik bulamadım.`,
    en: `I found no content for this week in ${detail.code}.`,
  };
  return { answer: none[language], source, confident: false, dataSource };
}

/** Demo answer for "what's on in LIBE 120": the week's section from Moodle, without an LLM. */
async function courseWeekReply(language: Language, question: string): Promise<ChatResponse | null> {
  const packages = await getCoursePackages();
  const matched = packages ? matchCourses(question, packages) : [];
  if (!matched.length) return null;
  const name = matched[0].code.replace(/ \(.*\)$/, '');
  const current = matched.flatMap((item) => item.sections.filter((section) => section.isCurrentWeek));
  const material = current.find((section) => section.materials.length > 0 || section.summary);
  if (material) {
    const lines = [material.summary, ...material.materials.map((item) => item.name)].filter(Boolean);
    const header = { tr: `${name}, bu hafta (${material.name}):`, en: `${name}, this week (${material.name}):` };
    return {
      ...reply(bullets(header[language], lines), `Moodle – ${name} – ${material.name}`),
      source: { label: `Moodle – ${name} – ${material.name}`, url: material.url },
      dataSource: 'moodle',
    };
  }
  const none = {
    tr: `Moodle'da ${name} için bu haftaya ait içerik bulamadım.`,
    en: `I found no content for this week in ${name} on Moodle.`,
  };
  return { answer: none[language], source: { label: 'Moodle', url: matched[0].url }, confident: false, dataSource: 'moodle' };
}

function faqReply(entry: FaqEntry, language: Language): ChatResponse {
  const answer = reply(entry.answer[language], entry.source[language], entry.link);
  return entry.link === '/calendar' ? { ...answer, dataSource: 'official' } : answer;
}

/** Keyword matching over sample data. Used whenever no AI key is configured. */
export const demoProvider: AiProvider = {
  async chat({ question, language, courseId }: ChatRequest) {
    const text = normalize(question);
    if (courseId != null && matchCourses(question, (await getCoursePackages()) ?? []).length === 0) {
      const reply = await selectedCourseReply(courseId, language, hasAny(text, ANNOUNCEMENT_WORDS));
      if (reply) return reply;
    }
    const match = bestFaq(text);

    // A specific FAQ ("geç teslim") beats the broader "ödev" intent.
    if (match && match.score >= 2) return faqReply(match.entry, language);
    if (hasAny(text, ANNOUNCEMENT_WORDS)) return announcementsReply(language, question);
    const courseReply = await courseWeekReply(language, question);
    if (courseReply) return courseReply;
    if (hasAny(text, ASSIGNMENT_WORDS)) return upcomingReply(language, 'assignment');
    if (hasAny(text, EXAM_WORDS)) return upcomingReply(language, 'exam');
    if (hasAny(text, EVENT_WORDS)) return eventsReply(language);
    if (match) return faqReply(match.entry, language);

    return { answer: TEXT.unsure[language], source: null, confident: false, dataSource: 'sample' };
  },

  async study(request: StudyStartRequest) {
    return buildDemoStudyPlan(request);
  },
};
