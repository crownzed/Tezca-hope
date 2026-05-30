import { useState } from 'react';
import { Link } from 'react-router';
import { LogIn, LogOut, Shield, SlidersHorizontal, UserCircle, KeyRound } from 'lucide-react';
import { ROUTES } from '../routes';
import { tezcaTheme } from '../lib/tezcaTheme';

export type AccountProfileUser = {
  name: string;
  email: string;
};

type Props = {
  role: 'customer' | 'expert';
  user: AccountProfileUser | null;
  isVerifying?: boolean;
  onLogout: () => void;
};

function userInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

const roleLabel = {
  customer: 'Khách hàng',
  expert: 'Chuyên gia',
} as const;

type AccountProfileButtonProps = Props & {
  className?: string;
  buttonClassName?: string;
  compact?: boolean;
  menuPlacement?: 'top' | 'bottom';
  menuAlign?: 'start' | 'end';
};

export function AccountProfileButton({
  role,
  user,
  isVerifying,
  onLogout,
  className = '',
  buttonClassName = '',
  compact,
  menuPlacement = 'bottom',
  menuAlign = 'end',
}: AccountProfileButtonProps) {
  const [open, setOpen] = useState(false);
  const profileTo = role === 'expert' ? ROUTES.expert.settings : ROUTES.auth.forgotPassword;
  const loginTo = role === 'expert' ? ROUTES.expert.login : ROUTES.app.login;
  const settingsLabel = role === 'expert' ? 'Cài đặt chuyên gia' : 'Đổi mật khẩu';
  const ProfileIcon = role === 'expert' ? SlidersHorizontal : KeyRound;
  const label = user ? 'Hồ sơ' : 'Đăng nhập';
  const menuPosition = menuPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
  const menuAlignment = menuAlign === 'start' ? 'left-0' : 'right-0';

  if (!user) {
    return (
      <Link
        to={loginTo}
        className={`flex items-center gap-3 rounded-2xl border px-3 py-3 no-underline transition-opacity hover:opacity-90 ${className} ${buttonClassName}`}
        style={{
          backgroundColor: tezcaTheme.surface,
          borderColor: tezcaTheme.border,
          boxShadow: tezcaTheme.cardShadow,
          color: tezcaTheme.text,
        }}
        aria-label="Đăng nhập tài khoản"
      >
        <ProfileAvatar compact={compact} />
        <ProfileButtonText compact={compact} icon={LogIn} isVerifying={isVerifying} label={label} role={role} />
      </Link>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        className={`w-full flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-opacity hover:opacity-90 cursor-pointer ${buttonClassName}`}
        style={{
          backgroundColor: tezcaTheme.surface,
          borderColor: tezcaTheme.border,
          boxShadow: tezcaTheme.cardShadow,
          color: tezcaTheme.text,
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Mở hồ sơ tài khoản"
        onClick={() => setOpen((value) => !value)}
      >
        <ProfileAvatar compact={compact} initials={userInitials(user.name)} />
        <ProfileButtonText compact={compact} icon={ProfileIcon} isVerifying={isVerifying} label={label} role={role} />
      </button>

      {open && (
        <div
          className={`absolute ${menuPosition} ${menuAlignment} z-50 w-64 rounded-2xl border p-2 text-sm`}
          style={{
            backgroundColor: tezcaTheme.surface,
            borderColor: tezcaTheme.border,
            boxShadow: '0 18px 50px -18px rgba(26, 32, 44, 0.28)',
            color: tezcaTheme.text,
          }}
          role="menu"
        >
          <div className="px-3 py-2 border-b mb-1" style={{ borderColor: tezcaTheme.border }}>
            <p className="font-semibold m-0 truncate">{user.name}</p>
            <p className="text-xs m-0 truncate" style={{ color: tezcaTheme.textMuted }} title={user.email}>
              {user.email}
            </p>
            <span
              className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-md"
              style={{ backgroundColor: 'rgba(45, 212, 191, 0.15)', color: tezcaTheme.accentDark }}
            >
              {roleLabel[role]}
            </span>
          </div>

          <ProfileMenuLink to={profileTo} icon={ProfileIcon} label={settingsLabel} onClick={() => setOpen(false)} />
          <ProfileMenuLink to={ROUTES.legal.privacy} icon={Shield} label="Chính sách bảo mật" onClick={() => setOpen(false)} muted />
          <ProfileMenuLink
            to={role === 'expert' ? ROUTES.app.login : ROUTES.auth.expertLogin}
            icon={LogIn}
            label={role === 'expert' ? 'Đăng nhập khách hàng' : 'Cổng chuyên gia'}
            onClick={() => setOpen(false)}
            muted
          />
          <button
            type="button"
            className="mt-1 w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold border-0 cursor-pointer hover:opacity-90"
            style={{ backgroundColor: tezcaTheme.subtleBg, color: tezcaTheme.text }}
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <LogOut size={14} aria-hidden />
            Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
}

function ProfileAvatar({ compact, initials }: { compact?: boolean; initials?: string }) {
  return (
    <div
      className={`${compact ? 'w-9 h-9 text-xs' : 'w-10 h-10 text-sm'} rounded-xl flex items-center justify-center font-bold shrink-0`}
      style={{
        background: initials ? tezcaTheme.accentGradient : tezcaTheme.subtleBg,
        color: initials ? tezcaTheme.text : tezcaTheme.accentDark,
      }}
      aria-hidden
    >
      {initials ?? <UserCircle size={18} />}
    </div>
  );
}

function ProfileButtonText({
  compact,
  icon: Icon,
  isVerifying,
  label,
  role,
}: {
  compact?: boolean;
  icon: typeof LogIn;
  isVerifying?: boolean;
  label: string;
  role: keyof typeof roleLabel;
}) {
  return (
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        <Icon size={15} style={{ color: tezcaTheme.accentDark }} aria-hidden />
        {isVerifying ? 'Đang kiểm tra' : label}
      </span>
      <span className="block text-[11px] truncate" style={{ color: tezcaTheme.textMuted }}>
        {compact ? roleLabel[role] : 'Tài khoản'}
      </span>
    </span>
  );
}

function ProfileMenuLink({
  to,
  icon: Icon,
  label,
  muted,
  onClick,
}: {
  to: string;
  icon: typeof LogIn;
  label: string;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 rounded-lg px-2.5 py-2 hover:opacity-90 transition-opacity no-underline"
      style={{ color: muted ? tezcaTheme.textMuted : tezcaTheme.text, backgroundColor: muted ? 'transparent' : tezcaTheme.subtleBg }}
      role="menuitem"
      onClick={onClick}
    >
      <Icon size={14} style={{ color: muted ? undefined : tezcaTheme.accent }} aria-hidden />
      {label}
    </Link>
  );
}
