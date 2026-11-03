import { useCallback, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { api } from '../services/api';
import type { ChatMessage } from '../types';
import { useStoredState } from './useStoredState';

const MIN_TYPING_MS = 600;
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function useChatState() {
  const { settings, t } = useSettings();
  const [stored, setMessages] = useStoredState<ChatMessage[]>('chat', []);
  const messages = Array.isArray(stored) ? stored : [];
  const [typing, setTyping] = useState(false);

  const send = useCallback(
    async (question: string, courseId?: number) => {
      setMessages((prev) => [...(Array.isArray(prev) ? prev : []), { id: newId(), role: 'user', text: question }]);
      setTyping(true);
      // A short pause keeps the typing indicator from flashing.
      const pause = new Promise((resolve) => setTimeout(resolve, MIN_TYPING_MS));
      let reply: ChatMessage;
      try {
        const [res] = await Promise.all([api.chat({ question, language: settings.language, courseId }), pause]);
        reply = {
          id: newId(),
          role: 'assistant',
          text: res.answer,
          source: res.source,
          confident: res.confident,
          dataSource: res.dataSource,
        };
      } catch {
        await pause;
        reply = { id: newId(), role: 'assistant', text: t('chat.error'), failed: true };
      }
      setMessages((prev) => [...(Array.isArray(prev) ? prev : []), reply]);
      setTyping(false);
    },
    [setMessages, settings.language, t],
  );

  const setFeedback = useCallback(
    (id: string, feedback: 'up' | 'down') =>
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, feedback: m.feedback === feedback ? undefined : feedback } : m)),
      ),
    [setMessages],
  );

  const reset = useCallback(() => setMessages([]), [setMessages]);

  return { messages, typing, send, setFeedback, reset };
}
