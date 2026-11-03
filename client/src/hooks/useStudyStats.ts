import { useCallback } from 'react';
import type { StudyRecord } from '../types';
import { useStoredState } from './useStoredState';

// Read by the dashboard in stage 6.
export function useStudyStats() {
  const [stored, setRecords] = useStoredState<StudyRecord[]>('study-stats', []);
  const records = Array.isArray(stored) ? stored : [];

  const addRecord = useCallback(
    (record: StudyRecord) =>
      setRecords((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        // One record per session, however many buttons were pressed.
        return list.some((item) => item.sessionId === record.sessionId) ? list : [...list, record];
      }),
    [setRecords],
  );

  return { records, addRecord };
}
