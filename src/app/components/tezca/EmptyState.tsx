import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionTo?: string;
  onAction?: () => void;
}) {
  const action =
    actionLabel && actionTo ? (
      <Link
        to={actionTo}
        className="inline-flex mt-4 rounded-full py-2.5 px-5 text-sm font-semibold no-underline"
        style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
      >
        {actionLabel}
      </Link>
    ) : actionLabel && onAction ? (
      <button
        type="button"
        onClick={onAction}
        className="inline-flex mt-4 rounded-full py-2.5 px-5 text-sm font-semibold border-0 cursor-pointer"
        style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
      >
        {actionLabel}
      </button>
    ) : null;

  return (
    <div className="rounded-2xl border p-8 text-center" style={tezcaCardStyle}>
      <span
        className="inline-flex p-3 rounded-2xl mb-3"
        style={{ backgroundColor: 'rgba(45, 212, 191, 0.15)', color: tezcaTheme.accentDark }}
      >
        <Icon size={28} aria-hidden />
      </span>
      <h3 className="text-base font-semibold m-0 mb-1" style={{ color: tezcaTheme.text }}>
        {title}
      </h3>
      <p className="text-sm m-0 opacity-70 max-w-sm mx-auto leading-relaxed" style={{ color: tezcaTheme.text }}>
        {description}
      </p>
      {action}
    </div>
  );
}
