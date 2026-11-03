import { useSettings } from '../../context/SettingsContext';
import type { TKey } from '../../i18n';
import {
  AlarmClock,
  BookOpen,
  ClipboardList,
  Flag,
  GraduationCap,
  PenLine,
  Star,
  Sunset,
  type LucideIcon,
} from 'lucide-react';
import type { CalendarApiEntry, CalendarEntryType } from '@teddy/shared';

export const ALL_TYPES: CalendarEntryType[] = [
  'holiday',
  'half_day',
  'exam',
  'registration',
  'deadline',
  'special',
  'moodle',
  'academic',
];
export const HOLIDAY_TYPES: CalendarEntryType[] = ['holiday', 'half_day'];

export const TYPE_META: Record<CalendarEntryType, { icon: LucideIcon; color: string }> = {
  holiday: { icon: Flag, color: 'text-critical' },
  half_day: { icon: Sunset, color: 'text-important' },
  exam: { icon: PenLine, color: 'text-critical' },
  registration: { icon: ClipboardList, color: 'text-primary' },
  deadline: { icon: AlarmClock, color: 'text-important' },
  special: { icon: Star, color: 'text-info' },
  moodle: { icon: BookOpen, color: 'text-primary' },
  academic: { icon: GraduationCap, color: 'text-muted' },
};

export const typeKey = (type: CalendarEntryType) => `calendar.type.${type}` as TKey;

/** Type label: icon plus text, never color alone. */
export function TypeBadge({ type }: { type: CalendarEntryType }) {
  const { t: c } = useSettings();
  const { icon: Icon, color } = TYPE_META[type];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap font-semibold ${color}`}>
      <Icon aria-hidden="true" size={18} />
      {c(typeKey(type))}
    </span>
  );
}

export function sourceLabelKey(entry: CalendarApiEntry): TKey {
  return entry.source === 'moodle' ? 'calendar.sourceMoodle' : 'calendar.sourceTedu';
}
