import type { Language, Localized, StudySample, StudyStartRequest } from '@teddy/shared';
import questionsFile from '../../data/study-questions.json';
import { hasKeyword, normalize } from './textMatch';
import type { StudyPlan } from './types';

interface StudyQuestion {
  id: string;
  courseCode: string;
  topic: Localized;
  question: Localized;
  hints: Localized[];
  explanation: Localized[];
  practice: { question: Localized; answer: Localized };
  keywords: string[];
}

const questions = questionsFile.items as StudyQuestion[];

// Used when demo mode has no prepared answer. It must not invent one.
const GENERIC = {
  topic: { tr: 'Genel', en: 'General' },
  hints: [
    { tr: 'Soruda verilenleri ve istenenleri ayrı ayrı yaz.', en: 'Write down what is given and what is asked separately.' },
    { tr: 'Bu soru dersin hangi konusuyla ilgili? Notlarında o bölümü bul.', en: 'Which topic does this belong to? Find that section in your notes.' },
    { tr: 'Daha küçük bir örnek üzerinde aynı adımları dene.', en: 'Try the same steps on a smaller example.' },
  ],
  explanation: {
    tr: 'Demo modunda bu soru için hazır bir açıklamam yok. Uydurmak istemem, ofis saatinde hocana sormanı öneririm.',
    en: "Demo mode has no prepared explanation for this question. I won't make one up, so I suggest asking your instructor during office hours.",
  },
};

// Moodle codes vary ("ECON101-01"), so sample courses match on a code prefix.
function sameCourse(moodleCode: string, sampleCode: string): boolean {
  const clean = (code: string) => code.replace(/[^a-z0-9]/gi, '').toUpperCase();
  return clean(moodleCode).startsWith(clean(sampleCode));
}

export function getStudySamples(courseCode: string, language: Language): StudySample[] {
  return questions
    .filter((item) => sameCourse(courseCode, item.courseCode))
    .map((item) => ({ id: item.id, question: item.question[language] }));
}

function findQuestion(courseCode: string, question: string): StudyQuestion | null {
  const text = normalize(question);
  let best: StudyQuestion | null = null;
  let bestScore = 0;
  for (const item of questions.filter((entry) => sameCourse(courseCode, entry.courseCode))) {
    if (text === normalize(item.question.tr) || text === normalize(item.question.en)) return item;
    const score = item.keywords.filter((keyword) => hasKeyword(text, keyword)).length;
    if (score > bestScore) {
      best = item;
      bestScore = score;
    }
  }
  return best;
}

export function buildDemoStudyPlan({ courseCode, question, language }: StudyStartRequest): StudyPlan {
  const match = findQuestion(courseCode, question);
  if (!match) {
    return {
      topic: GENERIC.topic[language],
      hints: GENERIC.hints.map((hint) => hint[language]),
      explanation: [GENERIC.explanation[language]],
      practice: null,
    };
  }
  return {
    topic: match.topic[language],
    hints: match.hints.map((hint) => hint[language]),
    explanation: match.explanation.map((step) => step[language]),
    practice: { question: match.practice.question[language], answer: match.practice.answer[language] },
  };
}
