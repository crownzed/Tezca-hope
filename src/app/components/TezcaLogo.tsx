import { Link } from 'react-router';
import { tezcaTheme } from '../lib/tezcaTheme';

const SIZES = {
  sm: { mark: 28, gap: 8, text: 'text-base' },
  md: { mark: 32, gap: 10, text: 'text-xl' },
  lg: { mark: 40, gap: 12, text: 'text-2xl' },
  xl: { mark: 48, gap: 14, text: 'text-3xl' },
} as const;

type TezcaLogoProps = {
  /** `full` = emblem + wordmark; `mark` = circular T only */
  variant?: 'full' | 'mark';
  size?: keyof typeof SIZES;
  /** Override wordmark color (e.g. on dark sidebar) */
  wordmarkColor?: string;
  className?: string;
  /** Accessible label when mark-only */
  title?: string;
};

/** Geometric T emblem — circle uses system accent, T is white */
export function TezcaLogoMark({
  size = 32,
  className = '',
  title = 'Tezca',
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <circle cx="24" cy="24" r="24" fill={tezcaTheme.accent} />
      <path
        fill="#ffffff"
        d="M13.5 13.5h21v6.2H26.4v15.3h-4.8V19.7H13.5V13.5z"
      />
    </svg>
  );
}

export function TezcaLogo({
  variant = 'full',
  size = 'md',
  wordmarkColor,
  className = '',
  title = 'Tezca',
}: TezcaLogoProps) {
  const s = SIZES[size];
  const textColor = wordmarkColor ?? tezcaTheme.text;

  if (variant === 'mark') {
    return <TezcaLogoMark size={s.mark} className={className} title={title} />;
  }

  return (
    <span className={`inline-flex items-center shrink-0 ${className}`} style={{ gap: s.gap }}>
      <TezcaLogoMark size={s.mark} title={title} />
      <span
        className={`font-semibold tracking-tight leading-none ${s.text}`}
        style={{ color: textColor, fontFamily: 'Inter, system-ui, sans-serif' }}
      >
        Tezca
      </span>
    </span>
  );
}

type TezcaLogoLinkProps = TezcaLogoProps & {
  to: string;
  onClick?: () => void;
};

/** Logo wrapped in a home/marketing link */
export function TezcaLogoLink({ to, onClick, className = '', ...logoProps }: TezcaLogoLinkProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`inline-flex items-center no-underline hover:opacity-90 transition-opacity ${className}`}
      aria-label="Tezca — trang chủ"
    >
      <TezcaLogo {...logoProps} />
    </Link>
  );
}
