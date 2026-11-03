import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';

// Official file only, never redrawn. Put it in public/brand/; SVG wins over PNG.
const SOURCES = ['/brand/tedu-logo.svg', '/brand/tedu-logo.png'];

export function Logo({ size = 40, stacked = false }: { size?: number; stacked?: boolean }) {
  const { t } = useSettings();
  const [index, setIndex] = useState(0);
  const src = SOURCES[index];

  return (
    <span className={`inline-flex items-center gap-3 ${stacked ? 'flex-col' : ''}`}>
      {src && (
        <img
          src={src}
          alt="TED Üniversitesi"
          height={size}
          style={{ height: size, width: 'auto' }}
          onError={() => setIndex(index + 1)}
        />
      )}
      <span className="font-[family-name:var(--font-heading)] text-xl font-bold tracking-wide text-primary">
        {t('app.name')}
      </span>
    </span>
  );
}
