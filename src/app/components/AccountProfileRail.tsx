import { useEffect, useRef, useState } from 'react';

import { Link } from 'react-router';

import { ChevronDown, LogIn, LogOut, Pencil, Shield, SlidersHorizontal, UserCircle } from 'lucide-react';

import { ROUTES } from '../routes';

import { tezcaTheme } from '../lib/tezcaTheme';



export type AccountProfileUser = {

  name: string;

  email: string;

};



type AccountRole = 'customer' | 'expert' | 'admin';



type Props = {

  role: AccountRole;

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



const roleLabel: Record<AccountRole, string> = {

  customer: 'Khách hàng',

  expert: 'Chuyên gia',

  admin: 'Quản trị',

};



function profilePath(role: AccountRole) {

  if (role === 'expert') return ROUTES.expert.settings;

  if (role === 'admin') return ROUTES.admin.dashboard;

  return ROUTES.app.profile;

}



function loginPath(role: AccountRole) {

  if (role === 'expert') return ROUTES.expert.login;

  if (role === 'admin') return ROUTES.auth.adminLogin;

  return ROUTES.app.login;

}



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

  const rootRef = useRef<HTMLDivElement>(null);

  const profileTo = profilePath(role);

  const loginTo = loginPath(role);

  const editLabel =

    role === 'expert' ? 'Sửa hồ sơ chuyên gia' : role === 'admin' ? 'Bảng quản trị' : 'Sửa hồ sơ';

  const EditIcon = role === 'expert' ? SlidersHorizontal : Pencil;

  const menuPosition = menuPlacement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

  const menuAlignment = menuAlign === 'start' ? 'left-0' : 'right-0';



  useEffect(() => {

    if (!open) return;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {

      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);

    };

    const onKey = (e: KeyboardEvent) => {

      if (e.key === 'Escape') setOpen(false);

    };

    document.addEventListener('mousedown', onPointerDown);

    document.addEventListener('touchstart', onPointerDown);

    document.addEventListener('keydown', onKey);

    return () => {

      document.removeEventListener('mousedown', onPointerDown);

      document.removeEventListener('touchstart', onPointerDown);

      document.removeEventListener('keydown', onKey);

    };

  }, [open]);



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

        <ProfileButtonText compact={compact} isVerifying={isVerifying} name={null} role={role} />

      </Link>

    );

  }



  const displayName = user.name?.trim() || 'Tài khoản';



  return (

    <div ref={rootRef} className={`relative ${className}`}>

      <button

        type="button"

        className={`w-full flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-opacity hover:opacity-90 cursor-pointer ${buttonClassName}`}

        style={{

          backgroundColor: tezcaTheme.surface,

          borderColor: open ? tezcaTheme.accent : tezcaTheme.border,

          boxShadow: tezcaTheme.cardShadow,

          color: tezcaTheme.text,

        }}

        aria-haspopup="menu"

        aria-expanded={open}

        aria-label={`Hồ sơ ${displayName}`}

        onClick={() => setOpen((value) => !value)}

      >

        <ProfileAvatar compact={compact} initials={userInitials(displayName)} />

        <ProfileButtonText compact={compact} isVerifying={isVerifying} name={displayName} role={role} />

        <ChevronDown

          size={16}

          className="shrink-0 opacity-50 transition-transform"

          style={{ transform: open ? 'rotate(180deg)' : undefined }}

          aria-hidden

        />

      </button>



      {open && (

        <div

          className={`absolute ${menuPosition} ${menuAlignment} z-50 w-72 rounded-2xl border p-2 text-sm`}

          style={{

            backgroundColor: tezcaTheme.surface,

            borderColor: tezcaTheme.border,

            boxShadow: '0 18px 50px -18px rgba(26, 32, 44, 0.28)',

            color: tezcaTheme.text,

          }}

          role="menu"

        >

          <div className="px-3 py-2.5 border-b mb-1" style={{ borderColor: tezcaTheme.border }}>

            <p className="font-semibold m-0 truncate">{displayName}</p>

            <p className="text-xs m-0 truncate mt-0.5" style={{ color: tezcaTheme.textMuted }} title={user.email}>

              {user.email}

            </p>

            <span

              className="inline-block mt-2 text-[10px] font-medium px-2 py-0.5 rounded-md"

              style={{ backgroundColor: 'rgba(45, 212, 191, 0.15)', color: tezcaTheme.accentDark }}

            >

              {roleLabel[role]}

            </span>

          </div>



          <ProfileMenuLink to={profileTo} icon={EditIcon} label={editLabel} onClick={() => setOpen(false)} primary />

          <ProfileMenuLink to={ROUTES.legal.privacy} icon={Shield} label="Chính sách bảo mật" onClick={() => setOpen(false)} muted />

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

  isVerifying,

  name,

  role,

}: {

  compact?: boolean;

  isVerifying?: boolean;

  name: string | null;

  role: AccountRole;

}) {

  const primary = isVerifying ? 'Đang kiểm tra…' : name ? name : 'Đăng nhập';

  const secondary = name ? roleLabel[role] : compact ? roleLabel[role] : 'Tài khoản Tezca';



  return (

    <span className="min-w-0 flex-1">

      <span className="block text-sm font-semibold truncate" style={{ color: tezcaTheme.text }}>

        {primary}

      </span>

      <span className="block text-[11px] truncate" style={{ color: tezcaTheme.textMuted }}>

        {secondary}

      </span>

    </span>

  );

}



function ProfileMenuLink({

  to,

  icon: Icon,

  label,

  muted,

  primary,

  onClick,

}: {

  to: string;

  icon: typeof LogIn;

  label: string;

  muted?: boolean;

  primary?: boolean;

  onClick: () => void;

}) {

  return (

    <Link

      to={to}

      className="flex items-center gap-2 rounded-lg px-2.5 py-2.5 hover:opacity-90 transition-opacity no-underline mb-0.5"

      style={{

        color: muted ? tezcaTheme.textMuted : tezcaTheme.text,

        backgroundColor: primary ? 'rgba(45, 212, 191, 0.12)' : 'transparent',

      }}

      role="menuitem"

      onClick={onClick}

    >

      <Icon size={15} style={{ color: primary ? tezcaTheme.accentDark : muted ? undefined : tezcaTheme.accent }} aria-hidden />

      <span className="font-medium">{label}</span>

    </Link>

  );

}


