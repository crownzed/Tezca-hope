import { tezcaTheme } from '../../lib/tezcaTheme';

export const authInputClass =
  'mt-1 w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-shadow';

export function authInputStyle(focus = false) {
  return {
    borderColor: tezcaTheme.borderStrong,
    color: tezcaTheme.text,
    backgroundColor: tezcaTheme.inputBg,
    ...(focus ? { boxShadow: `0 0 0 3px rgba(45, 212, 191, 0.25)` } : {}),
  };
}

export function AuthFormCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border p-6 md:p-8 shadow-xl"
      style={{ backgroundColor: tezcaTheme.surface, borderColor: tezcaTheme.border, boxShadow: tezcaTheme.cardShadow }}
    >
      <h2 className="text-lg font-semibold m-0 mb-4" style={{ color: tezcaTheme.text }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

export function AuthPrimaryButton({
  children,
  disabled,
  type = 'submit',
}: {
  children: React.ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="w-full rounded-full py-3 font-semibold disabled:opacity-50 border-0 cursor-pointer disabled:cursor-not-allowed"
      style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
    >
      {children}
    </button>
  );
}
