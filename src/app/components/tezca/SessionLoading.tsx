import { tezcaTheme } from '../../lib/tezcaTheme';

export function SessionLoading({
  title,
  hint = 'Nếu treo lâu, hãy chạy `npm run dev:all` và tải lại trang.',
  minHeight = '40vh',
}: {
  title: string;
  hint?: string;
  minHeight?: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 px-4"
      style={{ minHeight, color: tezcaTheme.textMuted }}
      role="status"
      aria-live="polite"
    >
      <div
        className="w-9 h-9 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: tezcaTheme.accent, borderTopColor: 'transparent' }}
        aria-hidden
      />
      <p className="text-sm font-medium m-0 text-center" style={{ color: tezcaTheme.text }}>
        {title}
      </p>
      {hint ? (
        <p className="text-xs m-0 text-center max-w-sm opacity-80 leading-relaxed">{hint}</p>
      ) : null}
    </div>
  );
}
