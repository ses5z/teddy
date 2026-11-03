import Anthropic from '@anthropic-ai/sdk';
import type { LlmClient } from './liveProvider';

const DEFAULT_MODEL = 'claude-opus-5-5';

export function createAnthropicClient(apiKey: string): LlmClient {
  // Explicit values stop the SDK picking up other credentials or gateways from the shell.
  const client = new Anthropic({
    apiKey,
    authToken: null,
    baseURL: process.env.AI_BASE_URL || 'https://api.anthropic.com',
    maxRetries: 2,
    timeout: 20_000,
  });

  return {
    async completeJson({ system, user, schema }) {
      const response = await client.beta.messages.create({
        model: process.env.AI_MODEL || DEFAULT_MODEL,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system,
        messages: [{ role: 'user', content: user }],
        output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
      } as never);
      const message = response as unknown as Anthropic.Message;

      if (message.stop_reason === 'refusal' || message.stop_reason === 'max_tokens') {
        throw new Error('LLM did not finish');
      }
      const block = message.content.find((item) => item.type === 'text');
      if (!block || block.type !== 'text') throw new Error('LLM returned no text');
      return JSON.parse(block.text) as unknown;
    },
  };
}
