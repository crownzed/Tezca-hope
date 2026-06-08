import { useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { ROUTES } from '../routes';
import {
  Flame,
  Scale,
  Heart,
  MessageCircle,
  ClipboardList,
  Home,
  Stethoscope,
  Trophy,
  ShieldPlus,
  Users,
} from 'lucide-react';
import { useCustomerSession } from '../lib/customerSessionGate';
import { AccountProfileButton } from '../components/AccountProfileRail';
import { MobileBottomNav, type MobileNavItem } from '../components/tezca/MobileBottomNav';
import { PageBreadcrumb } from '../components/tezca/PageBreadcrumb';
import { tezcaTheme } from '../lib/tezcaTheme';

const nav = [
  { to: ROUTES.app.dashboard, end: true, label: 'Trung tâm Kỷ luật', icon: Flame },
  { to: ROUTES.app.bmi, label: 'Theo dõi sức khỏe', icon: Scale },
  { to: ROUTES.app.mood, label: 'Nhật ký cảm xúc', icon: Heart },
  { to: ROUTES.app.chat, label: 'Tezca AI', icon: MessageCircle },
  { to: ROUTES.app.expertChat, label: 'Chat chuyên gia', icon: Stethoscope },
  { to: ROUTES.app.chooseExpert, label: 'Chọn chuyên gia', icon: ShieldPlus },
  { to: ROUTES.app.plans, label: 'Kế hoạch', icon: ClipboardList },
  { to: ROUTES.community.forum, label: 'Cộng đồng', icon: Users },
  { to: ROUTES.app.rewards, label: 'Phần thưởng', icon: Trophy },
];

const mobileNav: MobileNavItem[] = [
  { to: ROUTES.app.dashboard, end: true, label: 'Trung tâm', shortLabel: 'Trung tâm', icon: Flame },
  { to: ROUTES.app.bmi, label: 'BMI', shortLabel: 'BMI', icon: Scale },
  { to: ROUTES.app.chat, label: 'Tezca AI', shortLabel: 'AI', icon: MessageCircle },
  { to: ROUTES.app.expertChat, label: 'Chat chuyên gia', shortLabel: 'Chuyên gia', icon: Stethoscope },
  { to: ROUTES.app.chooseExpert, label: 'Chọn chuyên gia', shortLabel: 'Chọn CG', icon: ShieldPlus },
  { to: ROUTES.app.plans, label: 'Kế hoạch', shortLabel: 'Kế hoạch', icon: ClipboardList },
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
              ? { background: tezcaTheme.accentGradient, color: tezcaTheme.text }
              : { color: tezcaTheme.text }
          }
        >
          <Icon size={20} aria-hidden />
          <span className="whitespace-nowrap">{label}</span>
        </span>
      )}
    </NavLink>
  );
}

export function UserAppLayout() {
  const { user, token, sessionReady, isAuthenticated, isVerifying, logout } = useCustomerSession();
  const { pathname } = useLocation();
  const whiteShell =
    pathname === ROUTES.app.dashboard ||
    pathname === ROUTES.app.root ||
    pathname === ROUTES.app.expertChat;
  const pageBg = whiteShell ? tezcaTheme.surface : tezcaTheme.bg;

  const profileProps = {
    role: 'customer' as const,
    user: isAuthenticated && user ? { name: user.name, email: user.email } : null,
    isVerifying,
    onLogout: logout,
  };

  useEffect(() => {
    if (sessionReady && token && !user) logout();
  }, [sessionReady, token, user, logout]);

  return (
    <div className="min-h-screen flex flex-col xl:flex-row" style={{ backgroundColor: pageBg }}>
      <aside
        className="hidden xl:flex xl:w-64 shrink-0 flex-col border-b xl:border-b-0 xl:border-r px-4 py-4 xl:py-8"
        style={{ borderColor: tezcaTheme.border, backgroundColor: tezcaTheme.sidebarSurface }}
      >
        <Link
          to={ROUTES.home}
          className="flex items-center gap-2 mb-6 px-2 text-sm font-medium opacity-70 hover:opacity-100 no-underline"
          style={{ color: tezcaTheme.text }}
        >
          <Home size={18} aria-hidden />
          Về trang chủ
        </Link>
        <p
          className="px-2 text-xs font-semibold uppercase tracking-wider opacity-40 mb-3"
          style={{ color: tezcaTheme.text }}
        >
          Ứng dụng khách hàng
        </p>
        <nav className="flex flex-col gap-1">
          {nav.map((item) => (
            <SidebarLink key={item.to} {...item} />
          ))}
        </nav>
        <div className="mt-auto pt-6">
          <AccountProfileButton {...profileProps} menuPlacement="top" menuAlign="start" />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-0 min-w-0 pb-[4.5rem] xl:pb-0">
        <header
          className="xl:hidden shrink-0 border-b px-4 py-3 flex items-center justify-between gap-2"
          style={{ borderColor: tezcaTheme.border, backgroundColor: tezcaTheme.sidebarSurface }}
        >
          <Link to={ROUTES.home} className="font-semibold text-sm no-underline" style={{ color: tezcaTheme.text }}>
            Tezca
          </Link>
          <AccountProfileButton {...profileProps} compact className="shrink-0" buttonClassName="px-2 py-2 rounded-xl" />
        </header>
        <div className="flex-1 p-4 sm:p-6 md:p-10 overflow-auto" style={{ backgroundColor: pageBg, color: tezcaTheme.text }}>
          <PageBreadcrumb pathname={pathname} />
          <Outlet />
        </div>
      </div>

      <MobileBottomNav items={mobileNav} />
    </div>
  );
}
