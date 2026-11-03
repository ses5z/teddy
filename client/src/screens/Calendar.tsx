import { useSettings } from '../context/SettingsContext';

// Placeholder route; takvim-ajani builds the page.
export function CalendarPage() {
  const { t } = useSettings();
  return <h1 className="text-2xl font-bold">{t('calendar.title')}</h1>;
}
