import type { ReactNode } from 'react';
import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { useProfile } from './context/ProfileContext';
import { useSettings } from './context/SettingsContext';
import { Chat } from './screens/Chat';
import { CourseDetailScreen } from './screens/CourseDetail';
import { Dashboard } from './screens/Dashboard';
import { Home } from './screens/Home';
import { CalendarScreen, CoursesScreen, EventsScreen, RulesScreen } from './screens/InfoScreens';
import { Login } from './screens/Login';
import { Settings } from './screens/Settings';
import { StudyMode } from './screens/StudyMode';
import { Welcome } from './screens/Welcome';

// Sends first-time users through onboarding, then login.
function RequireProfile({ children }: { children: ReactNode }) {
  const { onboarded, profile } = useProfile();
  if (!onboarded) return <Navigate to="/welcome" replace />;
  if (!profile) return <Navigate to="/login" replace />;
  return children;
}

function NotFound() {
  const { t } = useSettings();
  return (
    <>
      <h1 className="mb-2 text-2xl font-bold">{t('notFound.title')}</h1>
      <Link to="/" className="underline">
        {t('notFound.home')}
      </Link>
    </>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route
          element={
            <RequireProfile>
              <Layout />
            </RequireProfile>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/calendar" element={<CalendarScreen />} />
          <Route path="/courses" element={<CoursesScreen />} />
          <Route path="/courses/:id" element={<CourseDetailScreen />} />
          <Route path="/events" element={<EventsScreen />} />
          <Route path="/rules" element={<RulesScreen />} />
          <Route path="/study" element={<StudyMode />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
