import { createAnthropicClient } from './anthropicProvider';
import { demoProvider } from './demoProvider';
import { createLiveProvider, type LlmClient } from './liveProvider';
import { createOpenAiClient } from './openaiProvider';
import { smallTalkReply } from './smallTalk';
import type { AiProvider } from './types';

// To add a vendor: write a client file and register it here. Nothing else changes.
const CLIENTS: Record<string, (apiKey: string) => LlmClient> = {
  anthropic: createAnthropicClient,
  openai: createOpenAiClient,
};

function createProvider(): AiProvider {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return demoProvider;
  const factory = CLIENTS[process.env.AI_PROVIDER || 'anthropic'];
  if (!factory) {
    console.warn('Unknown AI_PROVIDER; using demo mode');
    return demoProvider;
  }
  try {
    return createLiveProvider(factory(apiKey));
  } catch {
    console.warn('Live AI settings are invalid; using demo mode');
    return demoProvider;
  }
}

const provider = createProvider();

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
