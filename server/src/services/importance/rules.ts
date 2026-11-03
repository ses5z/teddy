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

const DATE_REASONS: Record<'soon' | 'week' | 'past' | 'later', Localized> = {
  soon: { tr: 'Son tarih 48 saat içinde.', en: 'Due within 48 hours.' },
  week: { tr: 'Son tarih 7 gün içinde.', en: 'Due within 7 days.' },
  past: { tr: 'Son tarih geçti.', en: 'The due date has passed.' },
  later: { tr: 'Son tarih henüz uzak.', en: 'The due date is still far away.' },
};

/** Recomputed on every request, because it changes as time passes. */
export function dateLevel(dueAt: string | null, language: Language, now = Date.now()): Level {
  if (!dueAt) return { level: 'info', reason: DATE_REASONS.later[language] };
  const left = new Date(dueAt).getTime() - now;
  if (left < 0) return { level: 'info', reason: DATE_REASONS.past[language] };
  if (left <= 48 * HOUR) return { level: 'critical', reason: DATE_REASONS.soon[language] };
  if (left <= 7 * 24 * HOUR) return { level: 'important', reason: DATE_REASONS.week[language] };
  return { level: 'info', reason: DATE_REASONS.later[language] };
}

const CRITICAL_WORDS = ['iptal', 'cancel', 'degisti', 'degisiklik', 'changed', 'ertelendi', 'postponed', 'zorunlu', 'mandatory', 'telafi', 'make-up', 'makeup'];
const IMPORTANT_WORDS = ['sinav', 'vize', 'final', 'exam', 'midterm', 'son tarih', 'deadline', 'quiz', 'odev', 'assignment', 'proje', 'project'];

const KEYWORD_REASONS: Record<Importance, Localized> = {
  critical: { tr: 'Değişiklik, iptal veya zorunlu katılım içeriyor.', en: 'Mentions a change, cancellation or mandatory attendance.' },
  important: { tr: 'Sınav, ödev veya son tarih içeriyor.', en: 'Mentions an exam, assignment or deadline.' },
  info: { tr: 'Genel bilgilendirme.', en: 'General information.' },
};

export function keywordLevel(text: string, language: Language): Level {
  const normalized = normalize(text);
  const has = (words: string[]) => words.some((word) => normalized.includes(word));
  const level: Importance = has(CRITICAL_WORDS) ? 'critical' : has(IMPORTANT_WORDS) ? 'important' : 'info';
  return { level, reason: KEYWORD_REASONS[level][language] };
}
