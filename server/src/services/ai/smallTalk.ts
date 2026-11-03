import type { ChatResponse, Language } from '@teddy/shared';
import { normalize } from './textMatch';

const REPLIES = {
  greeting: {
    tr: 'Merhaba! Ben TEDDY. Derslerin, duyuruların, ödevlerin veya kampüs kuralları hakkında soru sorabilirsin.',
    en: "Hi! I'm TEDDY. You can ask about your courses, announcements, assignments or campus rules.",
  },
  howAreYou: {
    tr: 'İyiyim, teşekkürler! Sana nasıl yardımcı olabilirim?',
    en: "I'm doing well, thanks! How can I help you?",
  },
  thanks: {
    tr: 'Rica ederim! Başka bir sorun olursa buradayım.',
    en: "You're welcome! I'm here if you have another question.",
  },
  bye: {
    tr: 'Görüşürüz, kolay gelsin!',
    en: 'See you, good luck!',
  },
};

// The whole message must be small talk, so "merhaba, ödevlerim neler?" still goes to the AI.
const PATTERNS: [RegExp, keyof typeof REPLIES][] = [
  [/^(merhaba(lar)?|selam(lar)?|slm|sa|selamun aleykum|hey|hi|hello|gunaydin|iyi (gunler|aksamlar)|good (morning|afternoon|evening)|teddy)( teddy)?$/, 'greeting'],
  [/^((selam |merhaba )?(naber|nasilsin|ne haber|how are you))( teddy)?$/, 'howAreYou'],
  [/^(tesekkur(ler| ederim)?|sag ?ol(un)?|eyvallah|thanks|thank you)( teddy)?$/, 'thanks'],
  [/^(gorusuruz|hosca kal|bye|goodbye)( teddy)?$/, 'bye'],
];

export function smallTalkReply(question: string, language: Language): ChatResponse | null {
  const text = normalize(question).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const match = PATTERNS.find(([pattern]) => pattern.test(text));
  if (!match) return null;
  return { answer: REPLIES[match[1]][language], source: null, confident: true, dataSource: 'sample' };
}
