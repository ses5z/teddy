import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ChatProvider } from './context/ChatContext';
import { ProfileProvider } from './context/ProfileContext';
import { SettingsProvider } from './context/SettingsContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <ErrorBoundary>
        <ProfileProvider>
          <ChatProvider>
            <App />
          </ChatProvider>
        </ProfileProvider>
      </ErrorBoundary>
    </SettingsProvider>
  </StrictMode>,
);
