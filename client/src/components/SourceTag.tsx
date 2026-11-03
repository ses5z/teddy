import type { ChatSource, DataSource } from '@teddy/shared';
import { FlaskConical, Link2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';

export function DataSourceBadge({ source }: { source: DataSource }) {
  const { t } = useSettings();
  const Icon = source === 'moodle' ? Link2 : FlaskConical;
  return (
    <span className="inline-flex items-center gap-1 text-muted">
      <Icon size={14} aria-hidden="true" />
      {t(source === 'moodle' ? 'source.moodle' : 'source.sample')}
    </span>
  );
}

export function SourceTag({ source, dataSource }: { source: ChatSource; dataSource?: DataSource }) {
  const { t } = useSettings();
  const label = t('source.prefix', { label: source.label });
  return (
    <p className="mt-1 flex flex-wrap items-center gap-3 text-muted">
      {source.url ? (
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline">
          {label}
        </a>
      ) : source.link ? (
        <Link to={source.link} className="underline">
          {label}
        </Link>
      ) : (
        <span>{label}</span>
      )}
      {dataSource && <DataSourceBadge source={dataSource} />}
    </p>
  );
}
