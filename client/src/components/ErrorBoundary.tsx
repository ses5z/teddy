import { Component, type ReactNode } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Button } from './Button';

function ErrorFallback() {
  const { t } = useSettings();
  return (
    <main className="mx-auto max-w-md p-6 text-center">
      <h1 className="mb-2 text-2xl font-bold">{t('error.title')}</h1>
      <p className="mb-4">{t('error.body')}</p>
      <Button onClick={() => window.location.reload()}>{t('error.reload')}</Button>
    </main>
  );
}

// Keeps the app off a white screen when a screen throws while rendering.
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? <ErrorFallback /> : this.props.children;
  }
}
