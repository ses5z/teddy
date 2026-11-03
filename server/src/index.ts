import 'dotenv/config';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { HealthResponse } from '@teddy/shared';
import { aiRouter } from './routes/ai';
import { announcementsRouter, assignmentsRouter, coursesRouter, refreshRouter } from './routes/courses';
import { calendarRouter } from './routes/calendar';
import { dataRouter } from './routes/data';
import { moodleRouter } from './routes/moodle';
import { studyRouter } from './routes/study';
import { aiMode } from './services/ai/aiService';

// Fixed to match the proxy in client/vite.config.ts; a generic PORT env must not move it.
const PORT = 3001;
// Loopback only: CORS limits browsers, the bind address limits everything else.
const HOST = '127.0.0.1';
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const app = express();

app.use(cors({ origin: LOCAL_ORIGIN }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => {
  const body: HealthResponse = {
    status: 'ok',
    aiMode,
    moodleConfigured: Boolean(process.env.MOODLE_URL && process.env.MOODLE_TOKEN),
  };
  res.json(body);
});

app.use('/api/ai', aiRouter);
app.use('/api/data', dataRouter);
app.use('/api/moodle', moodleRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/announcements', announcementsRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/refresh', refreshRouter);
app.use('/api/ai/study', studyRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'not_found' });
});

// Generic response on purpose: error details may contain secrets.
app.use((_err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled server error');
  res.status(500).json({ error: 'internal_error' });
});

app.listen(PORT, HOST, () => {
  console.log(`TEDDY server: http://${HOST}:${PORT}`);
});
