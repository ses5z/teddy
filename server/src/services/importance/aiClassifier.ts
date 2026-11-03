import { fileURLToPath } from 'node:url';
import { llmClient } from '../ai/llmClient';
import { createClassifier } from './classifier';

const CACHE_PATH = fileURLToPath(new URL('../../../.cache/importance.json', import.meta.url));

export const aiClassifier = createClassifier({ llm: llmClient, cachePath: CACHE_PATH });
