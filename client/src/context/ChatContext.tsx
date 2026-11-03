import { createContext, useContext, type ReactNode } from 'react';
import { useChatState } from '../hooks/useChat';

type ChatValue = ReturnType<typeof useChatState>;

const ChatContext = createContext<ChatValue | null>(null);

// Lives above the routes so an answer still arrives after the student leaves the chat screen.
export function ChatProvider({ children }: { children: ReactNode }) {
  return <ChatContext.Provider value={useChatState()}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const value = useContext(ChatContext);
  if (!value) throw new Error('useChat must be used inside ChatProvider');
  return value;
}
