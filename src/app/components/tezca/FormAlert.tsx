import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { tezcaTheme } from '../../lib/tezcaTheme';

type Variant = 'error' | 'success' | 'info';

const styles: Record<Variant, { bg: string; border: string; color: string; Icon: typeof AlertCircle }> = {
  error: {
    bg: 'rgba(239, 68, 68, 0.08)',
    border: 'rgba(239, 68, 68, 0.25)',
    color: '#B91C1C',
    Icon: AlertCircle,
  },
  success: {
    bg: 'rgba(45, 212, 191, 0.12)',
    border: 'rgba(45, 212, 191, 0.35)',
    color: tezcaTheme.accentDark,
    Icon: CheckCircle2,
  },
  info: {
    bg: tezcaTheme.subtleBg,
    border: tezcaTheme.borderStrong,
    color: tezcaTheme.text,
    Icon: Info,
  },
};

export function FormAlert({
  variant = 'error',
  children,
  className = '',
}: {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}) {
  const s = styles[variant];
  const Icon = s.Icon;
  return (
    <div
      role="alert"
      className={`flex gap-2.5 items-start text-sm rounded-xl p-3 m-0 ${className}`}
      style={{ backgroundColor: s.bg, border: `1px solid ${s.border}`, color: s.color }}
    >
      <Icon size={18} className="shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0 flex-1 leading-relaxed">{children}</div>
    </div>
  );
}
