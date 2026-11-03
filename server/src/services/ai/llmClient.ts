import { createAnthropicClient } from './anthropicProvider';
import type { LlmClient } from './liveProvider';
import { createOpenAiClient } from './openaiProvider';

// To add a vendor: write a client file and register it here. Nothing else changes.
const CLIENTS: Record<string, (apiKey: string) => LlmClient> = {
  anthropic: createAnthropicClient,
  openai: createOpenAiClient,
};

function createClient(): LlmClient | null {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) return null;
  const factory = CLIENTS[process.env.AI_PROVIDER || 'anthropic'];
  if (!factory) {
    console.warn('Unknown AI_PROVIDER; using demo mode');
    return null;
  }
  try {
    return factory(apiKey);
  } catch {
    console.warn('Live AI settings are invalid; using demo mode');
    return null;
  }
}

/** The configured vendor, or null in demo mode. */
export const llmClient = createClient();
