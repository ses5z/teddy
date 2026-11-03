import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { useStoredState } from '../hooks/useStoredState';
import { translate, type TKey } from '../i18n';
import type { Settings } from '../types';

const DEFAULTS: Settings = {
  language: 'tr',
  theme: 'light',
  fontSize: 'normal',
  highContrast: false,
};

interface SettingsValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  t: (key: TKey, params?: Record<string, string | number>) => string;
}

const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [stored, setSettings] = useStoredState<Settings>('settings', DEFAULTS);
  // Provider sits above ErrorBoundary, so bad stored data must not crash it.
  const settings = useMemo(() => ({ ...DEFAULTS, ...stored }), [stored]);

  // CSS reads these attributes; see index.css.
  useEffect(() => {
    const root = document.documentElement;
    root.lang = settings.language;
    root.dataset.theme = settings.theme;
    root.dataset.font = settings.fontSize;
    root.dataset.contrast = settings.highContrast ? 'high' : 'normal';
  }, [settings]);

  const update = useCallback(
    (patch: Partial<Settings>) => setSettings((prev) => ({ ...DEFAULTS, ...prev, ...patch })),
    [setSettings],
  );

  const value = useMemo<SettingsValue>(
    () => ({
      settings,
      update,
      t: (key, params) => translate(settings.language, key, params),
    }),
    [settings, update],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings must be used inside SettingsProvider');
  return value;
}
