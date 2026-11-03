import { Router } from 'express';
import type {
  StudyExplanationResponse,
  StudyHintResponse,
  StudyPracticeResponse,
  StudyStartRequest,
  StudyStartResponse,
} from '@teddy/shared';
import { aiService } from '../services/ai/aiService';
import { getStudySamples } from '../services/ai/demoStudy';
import { createSession, getSession } from '../services/ai/studySessions';
import { hasAny, normalize } from '../services/ai/textMatch';

const MAX_QUESTION_LENGTH = 2000;
const HOMEWORK_WORDS = ['odev', 'teslim', 'quiz', 'homework', 'assignment', 'due'];

export const studyRouter = Router();

studyRouter.get('/samples', (req, res) => {
  const language = req.query.lang === 'en' ? 'en' : 'tr';
  const course = typeof req.query.course === 'string' ? req.query.course : '';
  res.json(getStudySamples(course, language));
});

studyRouter.post('/start', async (req, res, next) => {
  const { courseCode, question, language } = (req.body ?? {}) as Partial<StudyStartRequest>;
  const validLanguage = language === 'tr' || language === 'en';
  if (
    typeof courseCode !== 'string' ||
    !courseCode ||
    typeof question !== 'string' ||
    !question.trim() ||
    question.length > MAX_QUESTION_LENGTH ||
    !validLanguage
  ) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }
  try {
    const plan = await aiService.study({ courseCode, question, language });
    const body: StudyStartResponse = {
      sessionId: createSession(plan),
      topic: plan.topic,
      hint: plan.hints[0],
      hintNumber: 1,
      totalHints: plan.hints.length,
      homeworkReminder: hasAny(normalize(question), HOMEWORK_WORDS),
    };
    res.json(body);
  } catch (error) {
    next(error);
  }
});

studyRouter.post('/:id/hint', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'session_not_found' });
    return;
  }
  if (session.hintsGiven >= session.plan.hints.length) {
    res.status(409).json({ error: 'no_more_hints' });
    return;
  }
  session.hintsGiven += 1;
  const body: StudyHintResponse = {
    hint: session.plan.hints[session.hintsGiven - 1],
    hintNumber: session.hintsGiven,
    totalHints: session.plan.hints.length,
  };
  res.json(body);
});

studyRouter.post('/:id/explanation', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'session_not_found' });
    return;
  }
  // The explanation is a choice made after a hint: with hints left, the student must confirm it.
  const confirmed = (req.body as { confirmed?: unknown } | undefined)?.confirmed === true;
  if (session.hintsGiven < session.plan.hints.length && !confirmed) {
    res.status(409).json({ error: 'confirmation_required' });
    return;
  }
  const body: StudyExplanationResponse = {
    steps: session.plan.explanation,
    practice: session.plan.practice,
  };
  res.json(body);
});

// For "Got it": gives the practice question without the explanation.
studyRouter.post('/:id/practice', (req, res) => {
  const session = getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: 'session_not_found' });
    return;
  }
  const body: StudyPracticeResponse = { practice: session.plan.practice };
  res.json(body);
});
