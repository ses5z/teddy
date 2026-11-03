import type { ChatRequest, ChatResponse, StudyPractice, StudyStartRequest } from '@teddy/shared';

/** Full answer plan. Stays on the server; see studySessions.ts. */
export interface StudyPlan {
  topic: string;
  hints: string[];
  explanation: string[];
  practice: StudyPractice | null;
}

/** Every AI backend (demo or live LLM) implements this. */
export interface AiProvider {
  chat(request: ChatRequest): Promise<ChatResponse>;
  study(request: StudyStartRequest): Promise<StudyPlan>;
}
