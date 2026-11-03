import { AlertTriangle, ThumbsDown, ThumbsUp, type LucideIcon } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import type { ChatMessage } from '../types';
import { SourceTag } from './SourceTag';

interface ChatBubbleProps {
  message: ChatMessage;
  onFeedback: (id: string, feedback: 'up' | 'down') => void;
}

export function ChatBubble({ message, onFeedback }: ChatBubbleProps) {
  const { t } = useSettings();

  if (message.role === 'user') {
    return (
      <li className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded bg-tint px-3 py-2">
          <span className="sr-only">{t('chat.you')}: </span>
          {message.text}
        </div>
      </li>
    );
  }

  const feedbackButton = (value: 'up' | 'down', Icon: LucideIcon, label: string) => {
    const pressed = message.feedback === value;
    return (
      <button
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        onClick={() => onFeedback(message.id, value)}
        className={`flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded border transition-colors ${
          pressed ? 'border-primary text-primary' : 'border-transparent text-muted'
        }`}
      >
        <Icon size={18} fill={pressed ? 'currentColor' : 'none'} aria-hidden="true" />
      </button>
    );
  };

  return (
    <li className="border-l-2 border-primary pl-3">
      <p className=" font-bold text-primary">{t('app.name')}</p>
      {message.confident === false && (
        <p className="flex items-center gap-1 font-semibold text-accent">
          <AlertTriangle size={14} aria-hidden="true" />
          {t('chat.unsure')}
        </p>
      )}
      <p className="whitespace-pre-wrap">{message.text}</p>
      {message.source && <SourceTag source={message.source} dataSource={message.dataSource} />}
      {!message.failed && (
        <div className="mt-1 flex gap-1">
          {feedbackButton('up', ThumbsUp, t('chat.feedbackUp'))}
          {feedbackButton('down', ThumbsDown, t('chat.feedbackDown'))}
        </div>
      )}
    </li>
  );
}
