import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnnouncementsBox } from '../components/AnnouncementsBox';
import { Button } from '../components/Button';
import { QuickActionCard } from '../components/QuickActionCard';
import { UpcomingBox } from '../components/UpcomingBox';
import { useProfile } from '../context/ProfileContext';
import { useSettings } from '../context/SettingsContext';
import { BookOpen, CalendarDays, GraduationCap, Megaphone, ScrollText, type LucideIcon } from 'lucide-react';
import type { TKey } from '../i18n';

const QUICK_ACTIONS: { to: string; icon: LucideIcon; label: TKey }[] = [
  { to: '/calendar', icon: CalendarDays, label: 'quick.calendar' },
  { to: '/courses', icon: BookOpen, label: 'quick.courses' },
  { to: '/events', icon: Megaphone, label: 'quick.events' },
  { to: '/rules', icon: ScrollText, label: 'quick.rules' },
  { to: '/study', icon: GraduationCap, label: 'quick.study' },
];
const SUGGESTIONS: TKey[] = ['home.q1', 'home.q2', 'home.q3', 'home.q4'];

function greetingKey(hour: number): TKey {
  if (hour < 12) return 'greeting.morning';
  return hour < 18 ? 'greeting.day' : 'greeting.evening';
}

export function Home() {
  const { t } = useSettings();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');

  const ask = (text: string) => navigate('/chat', { state: { question: text } });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (question.trim()) ask(question.trim());
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-bold">
        {t(greetingKey(new Date().getHours()))} {profile?.name}
      </h1>

      <form onSubmit={submit} className="flex gap-2">
        <label htmlFor="ask" className="sr-only">
          {t('home.askLabel')}
        </label>
        <input
          id="ask"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder={t('home.askPlaceholder')}
          className="min-h-14 min-w-0 flex-1 rounded border-2 border-border bg-surface px-4 text-lg"
        />
        <Button type="submit">{t('home.send')}</Button>
      </form>

      <section aria-labelledby="suggestions-title">
        <h2 id="suggestions-title" className="mb-2 font-semibold">
          {t('home.suggestions')}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((key) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => ask(t(key))}
                className="min-h-11 cursor-pointer rounded border border-border bg-surface px-3 py-1 text-left"
              >
                {t(key)}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="quick-title">
        <h2 id="quick-title" className="mb-2 font-semibold">
          {t('home.quickActions')}
        </h2>
        <div className="grid border-t border-border sm:grid-cols-2">
          {QUICK_ACTIONS.map((action) => (
            <QuickActionCard key={action.to} to={action.to} icon={action.icon} label={t(action.label)} />
          ))}
        </div>
      </section>

      <UpcomingBox />
      <AnnouncementsBox />
    </div>
  );
}
