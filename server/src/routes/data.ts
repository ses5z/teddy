import { Router } from 'express';
import { getUpcoming } from '../services/dataService';

export const dataRouter = Router();

dataRouter.get('/upcoming', async (req, res) => {
  const language = req.query.lang === 'en' ? 'en' : 'tr';
  // Home shows a week, the dashboard a month.
  const days = req.query.days === '30' ? 30 : 7;
  res.json(await getUpcoming(language, days));
});

