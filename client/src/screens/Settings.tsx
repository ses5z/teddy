import { useEffect, useState } from 'react';
import type { HealthResponse, MoodleStatus } from '@teddy/shared';
import { AlertTriangle, CheckCircle2, Unplug } from 'lucide-react';
import { Button } from '../components/Button';
import { OptionGroup } from '../components/OptionGroup';
import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';
import { clearAll } from '../services/storage';

export function Settings() {
  const { t, settings, update } = useSettings();
  const [health, setHealth] = useState<HealthResponse | 'down' | null>(null);

  const [moodle, setMoodle] = useState<MoodleStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [confirmingReset, setConfirmingReset] = useState(false);

  // Full reload so every provider starts again from empty storage.
  const resetData = () => {
    clearAll();
    window.location.href = '/welcome';
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      setMoodle(await api.moodleRefresh());
    } catch {
      setMoodle({ connected: false, problem: 'unreachable' });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth('down'));
    api.moodleStatus().then(setMoodle).catch(() => setMoodle({ connected: false, problem: 'unreachable' }));
  }, []);

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{t('settings.title')}</h1>

      <section className="mb-4 flex flex-col gap-4 border-b border-border pb-4">
        <h2 className="text-xl font-bold">{t('settings.appearance')}</h2>
        <OptionGroup
          label={t('settings.language')}
          value={settings.language}
          onChange={(language) => update({ language })}
          options={[
            { value: 'tr', label: 'Türkçe' },
            { value: 'en', label: 'English' },
          ]}
        />
        <OptionGroup
          label={t('settings.theme')}
          value={settings.theme}
          onChange={(theme) => update({ theme })}
          options={[
            { value: 'light', label: t('settings.themeLight') },
            { value: 'dark', label: t('settings.themeDark') },
          ]}
        />
        <OptionGroup
          label={t('settings.fontSize')}
          value={settings.fontSize}
          onChange={(fontSize) => update({ fontSize })}
          options={[
            { value: 'normal', label: t('settings.fontNormal') },
            { value: 'large', label: t('settings.fontLarge') },
            { value: 'xlarge', label: t('settings.fontXlarge') },
          ]}
        />
        <label className="flex min-h-11 items-center gap-2 font-semibold">
          <input
            type="checkbox"
            className="size-5"
            checked={settings.highContrast}
            onChange={(event) => update({ highContrast: event.target.checked })}
          />
          {t('settings.highContrast')}
        </label>
      </section>

      <section className="mb-4 border-b border-border pb-4">
        <h2 className="mb-2 font-semibold">{t('settings.moodle')}</h2>
        {moodle && (
          <div role="status" className="mb-3">
            <p className="flex items-center gap-2 font-semibold">
              {moodle.connected ? (
                <CheckCircle2 size={18} aria-hidden="true" />
              ) : (
                <Unplug size={18} aria-hidden="true" />
              )}
              {t(moodle.connected ? 'settings.moodleConnected' : 'settings.moodleDisconnected')}
            </p>
            {moodle.problem && <p className="text-muted">{t(`settings.problem.${moodle.problem}`)}</p>}
            {!moodle.connected && <p className="text-muted">{t('settings.demoNote')}</p>}
            {moodle.lastSync && (
              <p className="text-muted">
                {t('settings.lastSync', { time: new Date(moodle.lastSync).toLocaleTimeString(settings.language) })}
              </p>
            )}
          </div>
        )}
        <Button variant="secondary" disabled={refreshing} onClick={() => void refresh()}>
          {t(refreshing ? 'settings.refreshing' : 'settings.refresh')}
        </Button>
      </section>

      <section className="mb-4 border-b border-border pb-4">
        <h2 className="mb-2 font-semibold">{t('settings.server')}</h2>
        <p role="status">
          {health === 'down' && (
            <span className="inline-flex items-center gap-2">
              <AlertTriangle size={18} aria-hidden="true" />
              {t('settings.serverDown')}
            </span>
          )}
          {health && health !== 'down' && (
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={18} aria-hidden="true" />
              {t('settings.serverOk', { mode: health.aiMode })}
            </span>
          )}
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">{t('settings.data')}</h2>
        <p className="mb-3 text-muted">{t('settings.resetInfo')}</p>
        {confirmingReset ? (
          <div role="group" aria-label={t('settings.resetConfirm')}>
            <p className="mb-2 font-semibold text-accent">{t('settings.resetConfirm')}</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={resetData}>{t('settings.resetYes')}</Button>
              <Button variant="secondary" onClick={() => setConfirmingReset(false)}>
                {t('settings.resetNo')}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setConfirmingReset(true)}>
            {t('settings.reset')}
          </Button>
        )}
      </section>
    </>
  );
}
