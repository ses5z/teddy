import { randomUUID } from 'node:crypto';
import type { StudyPlan } from './types';

const TTL_MS = 60 * 60 * 1000;
const MAX_SESSIONS = 500;

interface StudySession {
  plan: StudyPlan;
  hintsGiven: number;
  expiresAt: number;
}

const sessions = new Map<string, StudySession>();

function prune() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (session.expiresAt < now) sessions.delete(id);
  }
  // Map keeps insertion order, so the first key is the oldest.
  while (sessions.size >= MAX_SESSIONS) {
    sessions.delete(sessions.keys().next().value as string);
  }
}

export function createSession(plan: StudyPlan): string {
  prune();
  const id = randomUUID();
  sessions.set(id, { plan, hintsGiven: 1, expiresAt: Date.now() + TTL_MS });
  return id;
}

export function getSession(id: string): StudySession | null {
  const session = sessions.get(id);
  return session && session.expiresAt >= Date.now() ? session : null;
}
