import { useEffect, useState, type FormEvent } from 'react';
import type { MoodleProfile } from '@teddy/shared';
import { courses, departments } from '@teddy/shared/data';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Logo } from '../components/Logo';
import { DataSourceBadge } from '../components/SourceTag';
import { useProfile } from '../context/ProfileContext';
import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';

const FIELD = 'min-h-11 rounded border border-control bg-surface px-3 font-normal';

// No password anywhere: Moodle details are confirmed, or typed in and kept in localStorage.
export function Login() {
  const { t, settings } = useSettings();
  const { setProfile } = useProfile();
  const navigate = useNavigate();
  const lang = settings.language;

  const [moodle, setMoodle] = useState<MoodleProfile | null | 'loading'>('loading');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    api
      .moodleProfile()
      .then((profile) => active && setMoodle(profile))
      .catch(() => active && setMoodle(null));
    return () => {
      active = false;
    };
  }, []);

  const toggleCourse = (code: string) =>
    setSelected((prev) => (prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code]));

  const confirmMoodle = (profile: MoodleProfile) => {
    setProfile({ name: profile.name, courses: profile.courses.map((course) => course.code), fromMoodle: true });
    navigate('/');
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !department) return;
    setProfile({ name: trimmed, department, year, courses: selected });
    navigate('/');
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <Logo />
      <h1 className="text-3xl font-bold">{t('login.title')}</h1>

      {moodle === 'loading' && <p role="status">{t('login.loading')}</p>}

      {moodle && moodle !== 'loading' && (
        <section className="flex flex-col gap-3">
          <DataSourceBadge source="moodle" />
          <p>{t('login.moodleConfirm')}</p>
          <p className="text-xl font-semibold">{moodle.name}</p>
          <ul className="border-t border-border">
            {moodle.courses.map((course) => (
              <li key={course.code} className="border-b border-border py-2">
                <strong>{course.code}</strong>
                {course.name !== course.code && ` · ${course.name}`}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => confirmMoodle(moodle)}>{t('login.confirm')}</Button>
            <Button variant="secondary" onClick={() => setMoodle(null)}>
              {t('login.manual')}
            </Button>
          </div>
        </section>
      )}

      {moodle === null && (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <p className="text-muted">{t('login.noMoodle')}</p>
          <label className="flex flex-col gap-1 font-semibold">
            {t('login.name')}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoComplete="given-name"
              className={FIELD}
            />
          </label>
          <label className="flex flex-col gap-1 font-semibold">
            {t('login.department')}
            <select
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              required
              className={FIELD}
            >
              <option value="">{t('login.departmentChoose')}</option>
              {departments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name[lang]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 font-semibold">
            {t('login.year')}
            <select value={year} onChange={(event) => setYear(Number(event.target.value))} className={FIELD}>
              {[1, 2, 3, 4].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend className="mb-1 font-semibold">{t('login.courses')}</legend>
            {courses.map((course) => (
              <label key={course.code} className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  className="size-5"
                  checked={selected.includes(course.code)}
                  onChange={() => toggleCourse(course.code)}
                />
                {course.code} · {course.name[lang]}
              </label>
            ))}
          </fieldset>
          <Button type="submit">{t('login.submit')}</Button>
        </form>
      )}
    </main>
  );
}
