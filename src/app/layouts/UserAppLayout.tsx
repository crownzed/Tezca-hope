import type { LucideIcon } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router';
import { ROUTES } from '../routes';
import {
  LayoutDashboard,
  Scale,
  Heart,
  MessageCircle,
  ClipboardList,
  Home,
  Stethoscope,
  LogIn,
  Trophy,
  Lock,
} from 'lucide-react';
import { usePatientAuth } from '../context/PatientAuthContext';

const nav = [
  { to: ROUTES.app.root, end: true, label: 'Tổng quan', icon: LayoutDashboard },
  { to: ROUTES.app.bmi, label: 'Chỉ số BMI', icon: Scale },
  { to: ROUTES.app.mood, label: 'Nhật ký cảm xúc', icon: Heart },
  { to: ROUTES.app.chat, label: 'Tezca AI', icon: MessageCircle },
  { to: ROUTES.app.expertChat, label: 'Chat chuyên gia', icon: Stethoscope },
  { to: ROUTES.app.plans, label: 'Kế hoạch', icon: ClipboardList },
  { to: ROUTES.app.rewards, label: 'Phần thưởng', icon: Trophy },
];

function SidebarLink({
  to,
  end,
  label,
  icon: Icon,
}: {
  to: string;
  end?: boolean;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <NavLink to={to} end={end}>
      {({ isActive }) => (
        <span
          className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
            isActive ? 'shadow-md' : 'opacity-75 hover:opacity-100'
          }`}
          style={
            isActive
              ? { background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)', color: '#1A202C' }
              : { color: '#1A202C' }
          }
        >
          <Icon size={20} />
          <span className="whitespace-nowrap">{label}</span>
        </span>
      )}
    </NavLink>
  );
}

function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

export function UserAppLayout() {
  const { user, token, sessionReady, logout } = usePatientAuth();

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ backgroundColor: '#F9F9FB' }}>
      <aside
        className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r px-4 py-4 md:py-8"
        style={{ borderColor: 'rgba(26, 32, 44, 0.08)', backgroundColor: 'rgba(255,255,255,0.9)' }}
      >
        <Link
          to={ROUTES.home}
          className="flex items-center gap-2 mb-6 px-2 text-sm font-medium opacity-70 hover:opacity-100"
          style={{ color: '#1A202C' }}
        >
          <Home size={18} />
          Về trang chủ
        </Link>
        <p className="px-2 text-xs font-semibold uppercase tracking-wider opacity-40 mb-3" style={{ color: '#1A202C' }}>
          Ứng dụng
        </p>
        <nav className="flex md:flex-col gap-1 overflow-x-auto pb-1 md:pb-0">
          {nav.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </nav>
        <div className="mt-6 pt-4 border-t px-2 space-y-2" style={{ borderColor: 'rgba(26, 32, 44, 0.08)' }}>
          {!sessionReady && token ? (
            <p className="text-xs opacity-50 m-0 px-1" style={{ color: '#1A202C' }}>
              Đang xác thực tài khoản…
            </p>
          ) : user ? (
            <div
              className="rounded-xl p-3 space-y-2"
              style={{ backgroundColor: 'rgba(45, 212, 191, 0.1)', border: '1px solid rgba(45, 212, 191, 0.25)' }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)', color: '#1A202C' }}
                  aria-hidden
                >
                  {userInitials(user.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold m-0 truncate" style={{ color: '#1A202C' }}>
                    {user.name}
                  </p>
                  <p className="text-[11px] opacity-60 m-0 truncate" style={{ color: '#1A202C' }} title={user.email}>
                    {user.email}
                  </p>
                </div>
              </div>
              <p className="text-[10px] m-0 flex items-center gap-1 opacity-70" style={{ color: '#0F766E' }}>
                <Lock size={10} />
                Dữ liệu &amp; chat AI riêng tư theo tài khoản
              </p>
              <button
                type="button"
                onClick={logout}
                className="text-xs font-medium opacity-80 hover:opacity-100 w-full text-left border-0 bg-transparent cursor-pointer p-0"
                style={{ color: '#0F766E' }}
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <Link
              to={ROUTES.app.login}
              className="flex items-center gap-2 text-sm font-medium py-2 rounded-xl px-2"
              style={{ color: '#1A202C', backgroundColor: 'rgba(45, 212, 191, 0.12)' }}
            >
              <LogIn size={18} />
              Đăng nhập đồng bộ
            </Link>
          )}
        </div>
      </aside>
      <div className="flex-1 p-6 md:p-10 overflow-auto" style={{ backgroundColor: '#000' }}>
        <Outlet />
      </div>
    </div>
  );
}
