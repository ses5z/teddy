import type { Importance, Language, Localized } from '@teddy/shared';
import { normalize } from '../ai/textMatch';

const RANK: Record<Importance, number> = { info: 0, important: 1, critical: 2 };
const HOUR = 60 * 60 * 1000;

export interface Level {
  level: Importance;
  reason: string;
}

export function higher(a: Level, b: Level): Level {
  return RANK[b.level] > RANK[a.level] ? b : a;
}

type DateReasons = Record<'soon' | 'week' | 'past' | 'later', Localized>;

const DATE_REASONS: DateReasons = {
  soon: { tr: 'Son tarih 48 saat içinde.', en: 'Due within 48 hours.' },
  week: { tr: 'Son tarih 7 gün içinde.', en: 'Due within 7 days.' },
  past: { tr: 'Son tarih geçti.', en: 'The due date has passed.' },
  later: { tr: 'Son tarih henüz uzak.', en: 'The due date is still far away.' },
};

/** Recomputed on every request, because it changes as time passes. */
export function dateLevel(dueAt: string | null, language: Language, now = Date.now(), reasons = DATE_REASONS): Level {
  if (!dueAt) return { level: 'info', reason: reasons.later[language] };
  const left = new Date(dueAt).getTime() - now;
  if (left < 0) return { level: 'info', reason: reasons.past[language] };
  if (left <= 48 * HOUR) return { level: 'critical', reason: reasons.soon[language] };
  if (left <= 7 * 24 * HOUR) return { level: 'important', reason: reasons.week[language] };
  return { level: 'info', reason: reasons.later[language] };
}

// TR words take suffixes ("sinavi", "odevler"); EN forms are listed so "final" misses "finally" and "exam" misses "example".
const CRITICAL_PATTERN = /\b(?:iptal|degisti|degisiklik|ertelen|zorunlu|telafi|cancel(?:s|ed|led|lation)?\b|changed\b|postponed\b|mandatory\b|make-?up\b)/;
const IMPORTANT_PATTERN = /\b(?:sinav|vize|son tarih|odev|proje|finals?\b|final(?:'\p{L}*|i|e|de|den|in|a)\b|exams?\b|midterms?\b|deadlines?\b|quiz(?:zes)?\b|assignments?\b|projects?\b)/u;
const UPLOAD_PATTERN = /\b(?:yuklendi|uploaded\b)/;

const KEYWORD_REASONS: Record<Importance, Localized> = {
  critical: { tr: 'Değişiklik, iptal veya zorunlu katılım içeriyor.', en: 'Mentions a change, cancellation or mandatory attendance.' },
  important: { tr: 'Sınav, ödev veya son tarih içeriyor.', en: 'Mentions an exam, assignment or deadline.' },
  info: { tr: 'Genel bilgilendirme.', en: 'General information.' },
};
const UPLOAD_REASON: Localized = { tr: 'Materyal yüklendiğini bildiriyor.', en: 'Says that material was uploaded.' };

export function keywordLevel(text: string, language: Language): Level {
  const normalized = normalize(text);
  const level: Importance = CRITICAL_PATTERN.test(normalized) ? 'critical' : IMPORTANT_PATTERN.test(normalized) ? 'important' : 'info';
  if (level === 'info' && UPLOAD_PATTERN.test(normalized)) return { level, reason: UPLOAD_REASON[language] };
  return { level, reason: KEYWORD_REASONS[level][language] };
}

// ---- Dates inside announcement text

const MONTHS: Record<string, number> = {
  ocak: 0, subat: 1, mart: 2, nisan: 3, mayis: 4, haziran: 5, temmuz: 6, agustos: 7, eylul: 8, ekim: 9, kasim: 10, aralik: 11,
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};
const MONTH_NAMES = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|');
const TR_MONTHS = 'ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik';
// "Kasim'da", "kasimda": Turkish months take a suffix.
const MONTH_TOKEN = `(?:(${TR_MONTHS})(?:'\\p{L}*|\\p{L}{0,6})|(${MONTH_NAMES})(?:'\\p{L}*)?)(?!\\p{L})`;
const DAY_FIRST = new RegExp(`(?<![\\d.])(?:(\\d{1,2})\\s*-\\s*)?(\\d{1,2})(?:st|nd|rd|th)?(?:\\s+of)?\\s+${MONTH_TOKEN}(?:,?\\s+(\\d{4})(?!\\d))?`, 'gu');
const MONTH_FIRST = new RegExp(`(?<!\\p{L})(${MONTH_NAMES})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?![\\d:.]*\\d)(?:,?\\s+(\\d{4})(?!\\d))?`, 'gu');
const NUMERIC = /(?<![\d.])(\d{1,2})[./](\d{1,2})[./](\d{4}|\d{2})(?![\d])/g;
const ISO = /(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/g;
const RELATIVE: [RegExp, number][] = [
  [/\b(?:bugun|today)/, 0],
  [/\b(?:yarin|tomorrow)/, 1],
];

/** Moodle sends "2026-11-03" for local dates, and new Date() would read that as UTC. */
function parsePosted(postedAt: string): Date {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(postedAt);
  return day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(postedAt);
}

function endOfDay(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month, day, 23, 59, 59);
  return date.getMonth() === month && date.getDate() === day ? date : null;
}

/** No year written: the year that puts the date closest to the day it was posted. */
function resolveYear(month: number, day: number, posted: Date): Date | null {
  const year = posted.getFullYear();
  const distance = (date: Date) => Math.abs(date.getTime() - posted.getTime());
  return [year - 1, year, year + 1]
    .map((candidate) => endOfDay(candidate, month, day))
    .filter((date): date is Date => date != null)
    .reduce<Date | null>((best, date) => (!best || distance(date) < distance(best) ? date : best), null);
}

/** Each date as the end of that day. "today" and "tomorrow" count from the posting date. */
export function extractDates(text: string, postedAt: string): Date[] {
  const posted = parsePosted(postedAt);
  const found: (Date | null)[] = [];
  const add = (month: number, day: number, year?: string) =>
    found.push(year ? endOfDay(Number(year), month, day) : resolveYear(month, day, posted));

  // Lowercase "may" is the English verb ("chapter 15 may be"); the month is capitalized.
  let rest = normalize(text.replace(/https?:\/\/\S+/g, ' ').replace(/\bmay\b/g, ' ').replace(/’/g, "'"));
  rest = rest.replace(NUMERIC, (_all, day, month, year) => {
    found.push(endOfDay(year.length === 2 ? 2000 + Number(year) : Number(year), Number(month) - 1, Number(day)));
    return ' ';
  });
  rest = rest.replace(ISO, (_all, year, month, day) => {
    found.push(endOfDay(Number(year), Number(month) - 1, Number(day)));
    return ' ';
  });
  rest = rest.replace(DAY_FIRST, (_all, from, day, trMonth, otherMonth, year) => {
    const month = MONTHS[trMonth ?? otherMonth];
    if (from) add(month, Number(from), year);
    add(month, Number(day), year);
    return ' ';
  });
  rest = rest.replace(MONTH_FIRST, (_all, name, day, year) => {
    add(MONTHS[name], Number(day), year);
    return ' ';
  });
  for (const [pattern, offset] of RELATIVE) {
    if (pattern.test(rest)) found.push(new Date(posted.getFullYear(), posted.getMonth(), posted.getDate() + offset, 23, 59, 59));
  }
  return found.filter((date): date is Date => date != null);
}

// ---- Announcement level

const OLD_AFTER_MS = 14 * 24 * HOUR;

const TEXT_DATE_REASONS: DateReasons = {
  soon: { tr: 'Duyurudaki en yakın tarih 48 saat içinde.', en: 'The nearest date in the announcement is within 48 hours.' },
  week: { tr: 'Duyurudaki en yakın tarih 7 gün içinde.', en: 'The nearest date in the announcement is within 7 days.' },
  past: { tr: 'Duyurudaki tarih geçti.', en: 'The date in the announcement has passed.' },
  later: { tr: 'Duyurudaki tarih henüz uzak.', en: 'The date in the announcement is still far away.' },
};
const ALL_PAST: Localized = { tr: 'Duyurudaki tüm tarihler geçmiş, bu yüzden bilgi seviyesinde.', en: 'All dates in the announcement have passed, so it stays at info level.' };
const OLD_NO_DATE: Localized = { tr: 'Tarih içermiyor ve 14 günden eski, bu yüzden bilgi seviyesinde.', en: 'It has no date and is older than 14 days, so it stays at info level.' };

export const isRecent = (postedAt: string, now = Date.now()) => now - parsePosted(postedAt).getTime() <= OLD_AFTER_MS;

/** Why an announcement can't rise above info any more, or null if it still can. */
function capReason(dates: Date[], postedAt: string, now: number): Localized | null {
  if (dates.length > 0) return dates.some((date) => date.getTime() >= now) ? null : ALL_PAST;
  return isRecent(postedAt, now) ? null : OLD_NO_DATE;
}

export const isCapped = (text: string, postedAt: string, now = Date.now()) =>
  capReason(extractDates(text, postedAt), postedAt, now) != null;

/** The higher of date and content, recomputed on every request. `content` is the AI's call when there is one. */
export function announcementLevel(
  text: string,
  postedAt: string,
  language: Language,
  now = Date.now(),
  content: Level = keywordLevel(text, language),
): Level & { capped: boolean } {
  const dates = extractDates(text, postedAt);
  const cap = capReason(dates, postedAt, now);
  if (cap) return { level: 'info', reason: cap[language], capped: true };
  const upcoming = dates.map((date) => date.getTime()).filter((time) => time >= now);
  const nearest = upcoming.length ? new Date(Math.min(...upcoming)).toISOString() : null;
  const byDate = nearest ? dateLevel(nearest, language, now, TEXT_DATE_REASONS) : null;
  return { ...(byDate ? higher(content, byDate) : content), capped: false };
}
