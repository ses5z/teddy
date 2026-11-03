import type { ChatSource, DataSource } from '@teddy/shared';
import type { Language } from '../i18n';

export type Theme = 'light' | 'dark';
export type FontSize = 'normal' | 'large' | 'xlarge';

export interface Settings {
  language: Language;
  theme: Theme;
  fontSize: FontSize;
  highContrast: boolean;
}

export interface Profile {
  name: string;
  department?: string;
  year?: number;
  courses?: string[];
  fromMoodle?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  source?: ChatSource | null;
  confident?: boolean;
  dataSource?: DataSource;
  failed?: boolean;
  feedback?: 'up' | 'down';
}

export interface StudyRecord {
  sessionId: string;
  courseCode: string;
  topic: string;
  hintsUsed: number;
  outcome: 'understood' | 'explanation';
  date: string;
}
