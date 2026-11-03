import { Router, type Request } from 'express';
import { classifyInBackground, getCourseDetail, listAnnouncements, listCourses } from '../services/courseCatalog';
import { getCoursePackages } from '../services/coursePackages';
import { clearMoodleCache, getStatus } from '../services/moodleService';

const languageOf = (req: Request) => (req.query.lang === 'en' ? 'en' : 'tr');

export const coursesRouter = Router();

coursesRouter.get('/', async (req, res) => {
  res.json(await listCourses(languageOf(req)));
});

coursesRouter.get('/:id', async (req, res) => {
  const detail = await getCourseDetail(Number(req.params.id), languageOf(req));
  if (!detail) {
    res.status(404).json({ error: 'course_not_found' });
    return;
  }
  const source = (await getCoursePackages()) ? 'moodle' : 'sample';
  classifyInBackground(source, detail.announcements);
  res.json({ source, data: detail });
});

export const announcementsRouter = Router();

announcementsRouter.get('/', async (req, res) => {
  const { source, data } = await listAnnouncements(languageOf(req));
  classifyInBackground(source, data);
  const courseId = Number(req.query.courseId);
  const { importance } = req.query;
  res.json({
    source,
    data: data.filter(
      (item) =>
        (!req.query.courseId || item.courseId === courseId) && (!importance || item.importance === importance),
    ),
  });
});

export const refreshRouter = Router();

refreshRouter.post('/', async (_req, res) => {
  clearMoodleCache();
  res.json(await getStatus());
});
