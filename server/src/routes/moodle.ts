import { Router } from 'express';
import { getMoodleProfile } from '../services/dataService';
import { getStatus } from '../services/moodleService';

export const moodleRouter = Router();

moodleRouter.get('/status', async (_req, res) => {
  res.json(await getStatus());
});

moodleRouter.get('/profile', async (_req, res) => {
  res.json(await getMoodleProfile());
});

