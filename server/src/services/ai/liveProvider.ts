import type { ChatRequest, ChatResponse, ChatSource, Language, Localized, StudyStartRequest } from '@teddy/shared';
import { buildChatContext } from './context';
import { CHAT_SCHEMA, STUDY_SCHEMA, chatSystemPrompt, studySystemPrompt } from './prompts';
import type { AiProvider, StudyPlan } from './types';

/** What a vendor file must provide: one JSON completion. */
export interface LlmClient {
  /** noRetry: a 429 throws at once, for background work that must not spend quota retrying. */
  completeJson(request: { system: string; user: string; schema: object; noRetry?: boolean }): Promise<unknown>;
}

// Source names come from here, not the model, so the label always matches the link.
const SOURCE_LABELS: Record<string, Localized> = {
  '/calendar': { tr: 'Akademik Takvim', en: 'Academic Calendar' },
  '/rules': { tr: 'Yönetmelik', en: 'Regulations' },
  '/courses': { tr: 'Dersler', en: 'Courses' },
  '/events': { tr: 'Etkinlikler', en: 'Events' },
};
const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isTextList = (value: unknown): value is string[] => Array.isArray(value) && value.length > 0 && value.every(isText);

const CLARIFY: Localized = {
  tr: 'Hangi dersi soruyorsun?',
  en: 'Which course do you mean?',
};

// LLM output is untrusted: anything off-shape throws, and aiService falls back to demo mode.
function toChatResponse(
  raw: unknown,
  moodleAvailable: boolean,
  language: Language,
  refs: Map<string, ChatSource>,
): ChatResponse {
  const reply = raw as Record<string, unknown>;
  if (!isText(reply?.answer) || typeof reply.confident !== 'boolean') throw new Error('Bad chat reply');
  const usedMoodle = reply.usedMoodle === true && moodleAvailable;
  const link = typeof reply.link === 'string' && reply.link in SOURCE_LABELS ? reply.link : undefined;
  let source: ChatResponse['source'] = null;
  // A ref only resolves to links the server built, so the model can't invent a URL.
  const moodleSource = typeof reply.sourceRef === 'string' ? refs.get(reply.sourceRef) : undefined;
  if (moodleSource) source = moodleSource;
  else if (usedMoodle) source = { label: 'Moodle' };
  else if (link) source = { label: SOURCE_LABELS[link][language], link };
  else if (isText(reply.sourceLabel)) source = { label: reply.sourceLabel };
  return {
    answer: reply.answer,
    source,
    confident: reply.confident,
    dataSource: usedMoodle || moodleSource ? 'moodle' : link === '/calendar' ? 'official' : 'sample',
  };
}

function toStudyPlan(raw: unknown): StudyPlan {
  const plan = raw as Record<string, unknown>;
  const practice = plan?.practice as Record<string, unknown> | undefined;
  if (!isText(plan?.topic) || !isTextList(plan.hints) || !isTextList(plan.explanation)) {
    throw new Error('Bad study plan');
  }
  if (!isText(practice?.question) || !isText(practice?.answer)) throw new Error('Bad study plan');
  return {
    topic: plan.topic,
    hints: plan.hints.slice(0, 3),
    explanation: plan.explanation,
    practice: { question: practice.question, answer: practice.answer },
  };
}

export function createLiveProvider(llm: LlmClient): AiProvider {
  return {
    async chat({ question, language, courseId }: ChatRequest) {
      const { text, moodleUsed, refs, clarify } = await buildChatContext(question, language, courseId);
      if (clarify) {
        return {
          answer: `${CLARIFY[language]} ${clarify.join(', ')}`,
          source: { label: 'Moodle' },
          confident: true,
          dataSource: 'moodle',
        };
      }
      const raw = await llm.completeJson({
        system: chatSystemPrompt(language),
        user: `<data>${text}</data>\n<question>${question}</question>`,
        schema: CHAT_SCHEMA,
      });
      return toChatResponse(raw, moodleUsed === 'moodle', language, refs);
    },

    async study({ courseCode, question, language }: StudyStartRequest) {
      const raw = await llm.completeJson({
        system: studySystemPrompt(language),
        user: `<course>${courseCode}</course>\n<question>${question}</question>`,
        schema: STUDY_SCHEMA,
      });
      return toStudyPlan(raw);
    },
  };
}
