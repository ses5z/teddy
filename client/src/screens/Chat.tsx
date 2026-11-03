import { useEffect, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { ChatBubble } from '../components/ChatBubble';
import { useChat } from '../context/ChatContext';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';

export function Chat() {
  const { t, settings } = useSettings();
  const { messages, typing, send, setFeedback, reset } = useChat();
  const [draft, setDraft] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawCourseId = Number(searchParams.get('courseId'));
  const courseId = Number.isInteger(rawCourseId) && rawCourseId > 0 ? rawCourseId : undefined;
  const [courseCode, setCourseCode] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const handledKey = useRef<string | null>(null);

  // A question handed over from Home. The key guards against StrictMode's double run.
  useEffect(() => {
    const question = (location.state as { question?: string } | null)?.question;
    if (!question || handledKey.current === location.key) return;
    handledKey.current = location.key;
    void send(question);
    navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location, navigate, send]);

  useEffect(() => {
    if (courseId == null) {
      setCourseCode(null);
      return;
    }
    let active = true;
    api
      .course(courseId, settings.language)
      .then((result) => active && setCourseCode(result.data.code))
      .catch(() => active && setSearchParams({}, { replace: true }));
    return () => {
      active = false;
    };
  }, [courseId, settings.language, setSearchParams]);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages, typing]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const question = draft.trim();
    if (!question || typing) return;
    setDraft('');
    void send(question, courseId);
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('chat.title')}</h1>
        <Button variant="secondary" onClick={reset} disabled={messages.length === 0 || typing}>
          {t('chat.new')}
        </Button>
      </header>

      {courseCode && (
        <p className="flex items-center justify-between gap-2 border-l-4 border-primary bg-tint py-1 pr-1 pl-3 font-semibold">
          {t('chat.courseContext', { code: courseCode })}
          <button
            type="button"
            aria-label={t('chat.clearCourse')}
            onClick={() => setSearchParams({})}
            className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </p>
      )}

      {messages.length === 0 && !typing && <p className="text-muted">{t('chat.empty')}</p>}

      <ul aria-live="polite" aria-relevant="additions" className="flex flex-col gap-3">
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} onFeedback={setFeedback} />
        ))}
      </ul>

      {typing && (
        <p role="status" className="text-muted">
          {t('chat.typing')}
        </p>
      )}
      <div ref={endRef} />

      <form onSubmit={submit} className="sticky bottom-20 flex gap-2 md:bottom-4">
        <label htmlFor="chat-input" className="sr-only">
          {t('chat.inputLabel')}
        </label>
        <input
          id="chat-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={2000}
          placeholder={t('home.askPlaceholder')}
          className="min-h-12 min-w-0 flex-1 rounded border-2 border-border bg-surface px-4"
        />
        <Button type="submit" disabled={typing || !draft.trim()}>
          {t('chat.send')}
        </Button>
      </form>
    </div>
  );
}
