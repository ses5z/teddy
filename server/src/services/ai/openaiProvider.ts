import type { LlmClient } from './liveProvider';

// Time per model. With fallbacks the total stays under the client's 45 second limit.
const MODEL_TIMEOUT_MS = 10_000;
const MAX_MODELS = 4;
// Rate limited, overloaded or broken: another model may still work.
const TRY_NEXT_STATUS = new Set([429, 500, 503, 404]);
const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

/** Any OpenAI-compatible API. AI_MODEL is required because model names differ per vendor. */
export function createOpenAiClient(apiKey: string): LlmClient {
  const model = process.env.AI_MODEL;
  if (!model) throw new Error('AI_MODEL is required');
  const fallbacks = (process.env.AI_FALLBACK_MODELS ?? '').split(',').map((name) => name.trim()).filter(Boolean);
  const models = [model, ...fallbacks].slice(0, MAX_MODELS);
  const baseUrl = (process.env.AI_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const { protocol, hostname } = new URL(baseUrl);
  if (protocol !== 'https:' && hostname !== '127.0.0.1' && hostname !== 'localhost') {
    throw new Error('AI_BASE_URL must use https');
  }

  return {
    async completeJson({ system, user, schema, noRetry }) {
      let lastError: Error = new Error('No model available');
      for (const name of models) {
        try {
          const res = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: name,
              messages: [
                { role: 'system', content: system },
                { role: 'user', content: user },
              ],
              response_format: { type: 'json_schema', json_schema: { name: 'reply', strict: true, schema } },
            }),
            redirect: 'error',
            signal: AbortSignal.timeout(MODEL_TIMEOUT_MS),
          });
          if (!res.ok) {
            lastError = new Error(`HTTP ${res.status}`);
            if (noRetry && res.status === 429) throw lastError;
            if (TRY_NEXT_STATUS.has(res.status)) {
              console.warn(`AI model ${name} failed (${lastError.message}); trying the next one`);
              continue;
            }
            throw lastError;
          }
          const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
          const text = data.choices?.[0]?.message?.content;
          if (!text) throw new Error('LLM returned no text');
          return JSON.parse(text) as unknown;
        } catch (error) {
          if (!(error instanceof Error) || error.name !== 'TimeoutError') throw error;
          lastError = error;
          console.warn(`AI model ${name} timed out; trying the next one`);
        }
      }
      throw lastError;
    },
  };
}
