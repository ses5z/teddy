import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export function QuickActionCard({ to, icon: Icon, label }: { to: string; icon: LucideIcon; label: string }) {
  return (
    <Link
      to={to}
      className="flex min-h-14 items-center gap-3 border-b border-border px-1 font-semibold transition-colors hover:bg-tint"
    >
      <Icon size={22} className="text-primary" aria-hidden="true" />
      <span className="flex-1">{label}</span>
      <ChevronRight size={18} className="text-muted" aria-hidden="true" />
    </Link>
  );
}
