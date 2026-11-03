import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Button } from '../components/Button';
import { useProfile } from '../context/ProfileContext';
import { useSettings } from '../context/SettingsContext';
import type { TKey } from '../i18n';

const STEPS: TKey[] = ['welcome.step1', 'welcome.step2', 'welcome.step3'];

export function Welcome() {
  const { t, settings, update } = useSettings();
  const { setOnboarded } = useProfile();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const finish = () => {
    setOnboarded(true);
    navigate('/login');
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 p-6 text-center">
      <Logo size={112} stacked />
      <h1 className="text-3xl font-bold">{t('welcome.title')}</h1>

      <fieldset className="flex items-center gap-2">
        <legend className="mb-2 w-full">{t('welcome.language')}</legend>
        <Button
          variant={settings.language === 'tr' ? 'primary' : 'secondary'}
          aria-pressed={settings.language === 'tr'}
          onClick={() => update({ language: 'tr' })}
        >
          Türkçe
        </Button>
        <Button
          variant={settings.language === 'en' ? 'primary' : 'secondary'}
          aria-pressed={settings.language === 'en'}
          onClick={() => update({ language: 'en' })}
        >
          English
        </Button>
      </fieldset>

      <section aria-live="polite" className="w-full border-y border-border py-5">
        <p className="mb-2 text-muted">
          {t('welcome.stepOf', { current: step + 1, total: STEPS.length })}
        </p>
        <p>{t(STEPS[step])}</p>
      </section>

      <div className="flex w-full justify-between gap-2">
        <Button variant="secondary" onClick={finish}>
          {t('common.skip')}
        </Button>
        <Button onClick={() => (step === STEPS.length - 1 ? finish() : setStep(step + 1))}>
          {t('common.continue')}
        </Button>
      </div>
    </main>
  );
}
