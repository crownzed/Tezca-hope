import type { LucideIcon } from 'lucide-react';
import { NavLink } from 'react-router';
import { tezcaTheme } from '../../lib/tezcaTheme';

export type MobileNavItem = {
  to: string;
  end?: boolean;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
};

export function MobileBottomNav({ items }: { items: MobileNavItem[] }) {
  return (
    <nav
      className="xl:hidden fixed bottom-0 inset-x-0 z-40 border-t safe-area-pb"
      style={{
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: tezcaTheme.border,
        backdropFilter: 'blur(12px)',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
      }}
      aria-label="Điều hướng chính"
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="flex-1 min-w-0">
            {({ isActive }) => {
              const Icon = item.icon;
              return (
                <span
                  className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 text-[10px] font-medium"
                  style={{ color: isActive ? tezcaTheme.accentDark : tezcaTheme.textMuted }}
                >
                  <Icon size={20} strokeWidth={isActive ? 2.25 : 2} aria-hidden />
                  <span className="truncate w-full text-center">{item.shortLabel ?? item.label}</span>
                </span>
              );
            }}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
