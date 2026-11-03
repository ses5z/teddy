import { useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { CourseListItem, DataSource, StudyPractice, StudySample, StudyStartResponse } from '@teddy/shared';
import { courses } from '@teddy/shared/data';
import { AlertTriangle, Check, Lightbulb } from 'lucide-react';
import { Button } from '../components/Button';
import { DataSourceBadge } from '../components/SourceTag';
import { useProfile } from '../context/ProfileContext';
import { useSettings } from '../context/SettingsContext';
import { useStudyStats } from '../hooks/useStudyStats';
import { api } from '../services/api';

const CARD = 'border-l-4 border-primary py-1 pl-4';
const ROW = 'min-h-11 w-full cursor-pointer border-b border-border py-3 text-left transition-colors hover:bg-tint';

/** Active question state: hints, then explanation and/or practice. */
interface Session {
  start: StudyStartResponse;
  question: string;
  hints: string[];
  steps: string[] | null;
  practice: StudyPractice | null;
  finished: boolean;
}

export function StudyMode() {
  const { t, settings } = useSettings();
  const { addRecord } = useStudyStats();
  const { profile } = useProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  // The course page opens hints with ?course=CODE.
  const courseCode = searchParams.get('course');
  const setCourseCode = (code: string | null) => setSearchParams(code ? { course: code } : {});
  const [samples, setSamples] = useState<StudySample[]>([]);
  const [draft, setDraft] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [answerShown, setAnswerShown] = useState(false);
  const [courseList, setCourseList] = useState<CourseListItem[]>([]);
  const [courseSource, setCourseSource] = useState<DataSource>('sample');
  const lang = settings.language;

  useEffect(() => {
    const sample = () => courses.map((course, index) => ({ id: 101 + index, code: course.code, name: course.name[lang] }));
    let active = true;
    api
      .courses(lang)
      .then((result) => {
        if (!active) return;
        const selected = profile?.courses;
        // Manual login: only the courses the student picked.
        const list =
          result.source === 'sample' && selected?.length
            ? result.data.filter((course) => selected.includes(course.code))
            : result.data;
        setCourseList(list);
        setCourseSource(result.source);
      })
      .catch(() => {
        if (!active) return;
        setCourseList(sample());
        setCourseSource('sample');
      });
    return () => {
      active = false;
    };
  }, [lang, profile]);

  useEffect(() => {
    if (!courseCode) return;
    let active = true;
    api
      .studySamples(courseCode, lang)
      .then((list) => active && setSamples(list))
      .catch(() => active && setSamples([]));
    return () => {
      active = false;
    };
  }, [courseCode, lang]);

  // Shared wrapper: any failed call shows one friendly message.
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(false);
    try {
      await action();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setSession(null);
    setDraft('');
    setConfirming(false);
    setAnswerShown(false);
    setError(false);
  };

  const ask = (question: string) =>
    run(async () => {
      const start = await api.studyStart({ courseCode: courseCode!, question, language: lang });
      setSession({ start, question, hints: [start.hint], steps: null, practice: null, finished: false });
    });

  const record = (current: Session, outcome: 'understood' | 'explanation') =>
    addRecord({
      sessionId: current.start.sessionId,
      courseCode: courseCode!,
      topic: current.start.topic,
      hintsUsed: current.hints.length,
      outcome,
      date: new Date().toISOString(),
    });

  const moreHint = () =>
    run(async () => {
      setConfirming(false);
      const res = await api.studyHint(session!.start.sessionId);
      setSession({ ...session!, hints: [...session!.hints, res.hint] });
    });

  const showExplanation = () =>
    run(async () => {
      setConfirming(false);
      const res = await api.studyExplanation(session!.start.sessionId);
      record(session!, 'explanation');
      setSession({ ...session!, steps: res.steps, practice: res.practice, finished: true });
    });

  const understood = () =>
    run(async () => {
      setConfirming(false);
      const res = await api.studyPractice(session!.start.sessionId);
      record(session!, 'understood');
      setSession({ ...session!, practice: res.practice, finished: true });
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (draft.trim()) void ask(draft.trim());
  };

  const errorNote = error && (
    <p role="alert" className="flex items-center gap-2 font-semibold text-accent">
      <AlertTriangle size={18} aria-hidden="true" />
      {t('study.error')}
    </p>
  );

  // Step 1: course
  if (!courseCode) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">{t('study.title')}</h1>
        <p>{t('study.intro')}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{t('study.chooseCourse')}</h2>
          <DataSourceBadge source={courseSource} />
        </div>
        <ul className="border-t border-border">
          {courseList.map((course) => (
            <li key={course.code}>
              <Link to={`/courses/${course.id}`} className={`${ROW} block font-semibold`}>
                {course.name === course.code ? course.code : `${course.code} · ${course.name}`}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Step 2: question
  if (!session) {
    return (
      <div className="flex flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">
            {t('study.title')} · {courseCode}
          </h1>
          <Button variant="secondary" onClick={() => setCourseCode(null)}>
            {t('study.changeCourse')}
          </Button>
        </header>
        <form onSubmit={submit} className="flex flex-col gap-2">
          <label htmlFor="study-question" className="font-semibold">
            {t('study.questionLabel')}
          </label>
          <textarea
            id="study-question"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={2000}
            rows={3}
            placeholder={t('study.placeholder')}
            className="rounded border-2 border-control bg-surface p-3"
          />
          <Button type="submit" disabled={busy || !draft.trim()}>
            {t('study.start')}
          </Button>
        </form>
        {errorNote}
        {samples.length > 0 && (
          <section aria-labelledby="study-samples">
            <h2 id="study-samples" className="mb-2 font-semibold">
              {t('study.samples')}
            </h2>
            <ul className="border-t border-border">
              {samples.map((sample) => (
                <li key={sample.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void ask(sample.question)}
                    className={ROW}
                  >
                    {sample.question}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  // Step 3: hints, then explanation and practice
  const { start, hints, steps, practice, finished } = session;
  const hintsLeft = hints.length < start.totalHints;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">
        {t('study.title')} · {courseCode}
      </h1>
      <p className="font-semibold">{t('study.yourQuestion', { question: session.question })}</p>

      {start.homeworkReminder && (
        <p className="flex gap-2 bg-tint p-3">
          <Lightbulb size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
          {t('study.homework')}
        </p>
      )}

      <div aria-live="polite" className="flex flex-col gap-4">
        <ol className="flex flex-col gap-2">
          {hints.map((hint, index) => (
            <li key={index} className={CARD}>
              <h2 className="font-semibold">{t('study.hintTitle', { current: index + 1, total: start.totalHints })}</h2>
              <p>{hint}</p>
            </li>
          ))}
        </ol>

        {steps && (
          <section className={CARD}>
            <h2 className="mb-2 font-bold">{t('study.explanation')}</h2>
            <ol className="flex list-decimal flex-col gap-1 pl-6">
              {steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
          </section>
        )}

        {finished && <p>{t('study.result', { count: hints.length })}</p>}

        {practice && (
          <section className={CARD}>
            <h2 className="mb-2 font-bold">{t('study.practice')}</h2>
            <p className="mb-2">{practice.question}</p>
            {answerShown ? (
              <p className="font-semibold">{t('study.answer', { answer: practice.answer })}</p>
            ) : (
              <Button variant="secondary" onClick={() => setAnswerShown(true)}>
                {t('study.showAnswer')}
              </Button>
            )}
          </section>
        )}
      </div>

      {errorNote}

      {!finished && confirming && (
        <div role="group" aria-label={t('study.confirm')} className={CARD}>
          <p className="mb-2 font-semibold">{t('study.confirm')}</p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void moreHint()}>
              {t('study.confirmHint')}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => void showExplanation()}>
              {t('study.confirmShow')}
            </Button>
          </div>
        </div>
      )}

      {!finished && !confirming && (
        <div className="flex flex-wrap gap-2">
          {hintsLeft && (
            <Button disabled={busy} onClick={() => void moreHint()}>
              {t('study.moreHint')}
            </Button>
          )}
          {/* With hints left, ask first so the answer is not one tap away. */}
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => (hintsLeft ? setConfirming(true) : void showExplanation())}
          >
            {t('study.showExplanation')}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => void understood()}>
            <span className="inline-flex items-center gap-1">
              <Check size={18} aria-hidden="true" />
              {t('study.understood')}
            </span>
          </Button>
        </div>
      )}

      {finished && (
        <div>
          <Button onClick={reset}>{t('study.newQuestion')}</Button>
        </div>
      )}
    </div>
  );
}
