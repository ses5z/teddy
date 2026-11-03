import { useId, useState } from 'react';
import type { Importance } from '@teddy/shared';
import { AlertTriangle, Clock, HelpCircle, Info, type LucideIcon } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import type { TKey } from '../i18n';

const STYLES: Record<Importance, { icon: LucideIcon; label: TKey; badge: string }> = {
  critical: { icon: AlertTriangle, label: 'importance.critical', badge: 'bg-critical-bg text-critical' },
  important: { icon: Clock, label: 'importance.important', badge: 'bg-important-bg text-important' },
  info: { icon: Info, label: 'importance.info', badge: 'bg-info-bg text-info' },
};

/** Left stripe for cards and list rows. */
export const IMPORTANCE_STRIPE: Record<Importance, string> = {
  critical: 'border-critical',
  important: 'border-important',
  info: 'border-info',
};

export function ImportanceBadge({ level, reason }: { level: Importance; reason: string }) {
  const { t } = useSettings();
  const [open, setOpen] = useState(false);
  const tooltipId = useId();
  const { icon: Icon, label, badge } = STYLES[level];

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span
        role="img"
        aria-label={t('importance.aria', { level: t(label), reason })}
        className={`inline-flex items-center gap-1 rounded px-2 font-semibold ${badge}`}
      >
        <Icon size={15} aria-hidden="true" />
        {t(label)}
      </span>
      {/* A button rather than hover, so keyboard and touch can open it too. */}
      <button
        type="button"
        aria-label={t('importance.why')}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => setOpen(!open)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false);
        }}
        className="inline-flex min-h-8 min-w-8 cursor-pointer items-center justify-center rounded text-muted"
      >
        <HelpCircle size={16} aria-hidden="true" />
      </button>
      {open && (
        <span id={tooltipId} role="tooltip" className="basis-full text-muted">
          {reason}
        </span>
      )}
    </span>
  );
}
