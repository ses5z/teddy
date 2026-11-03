import { Router } from 'express';
import type { ChatRequest } from '@teddy/shared';
import { aiService } from '../services/ai/aiService';

const MAX_QUESTION_LENGTH = 2000;

export const aiRouter = Router();

aiRouter.post('/chat', async (req, res, next) => {
  const { question, language, courseId } = (req.body ?? {}) as Partial<ChatRequest>;
  const validLanguage = language === 'tr' || language === 'en';
  if (typeof question !== 'string' || !question.trim() || question.length > MAX_QUESTION_LENGTH || !validLanguage) {
    res.status(400).json({ error: 'invalid_request' });
    return;
  }
  try {
    res.json(
      await aiService.chat({ question, language, courseId: Number.isInteger(courseId) ? courseId : undefined }),
    );
  } catch (error) {
    next(error);
  }
});
