import { demoProvider } from './demoProvider';
import { llmClient } from './llmClient';
import { createLiveProvider } from './liveProvider';
import { smallTalkReply } from './smallTalk';
import type { AiProvider } from './types';

const provider: AiProvider = llmClient ? createLiveProvider(llmClient) : demoProvider;

export const aiMode: 'demo' | 'live' = provider === demoProvider ? 'demo' : 'live';

// Only the error type and our own HTTP code: provider messages could hold secrets.
function reason(error: unknown): string {
  if (!(error instanceof Error)) return 'unknown';
  return error.message.startsWith('HTTP ') ? error.message : error.name;
}

const OUTAGE = {
  tr: 'Yapay zekâ servisine şu anda ulaşamıyorum. Lütfen biraz sonra tekrar dene.',
  en: "I can't reach the AI service right now. Please try again shortly.",
};

// A failing LLM never reaches the student. Error details are dropped: they could hold secrets.
export const aiService: AiProvider = {
  async chat(request) {
    const smallTalk = smallTalkReply(request.question, request.language);
    if (smallTalk) return smallTalk;
    try {
      return await provider.chat(request);
    } catch (error) {
      console.warn(`Live AI failed (${reason(error)}); answering in demo mode`);
      const reply = await demoProvider.chat(request);
      // "I don't know" would be misleading here: the assistant is down, not the answer missing.
      return reply.confident ? reply : { ...reply, answer: OUTAGE[request.language] };
    }
  },
  async study(request) {
    try {
      return await provider.study(request);
    } catch (error) {
      console.warn(`Live AI failed (${reason(error)}); using the demo study plan`);
      return demoProvider.study(request);
    }
  },
};
