import { useEffect, type CSSProperties } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { ROUTES } from '../routes';
import { LayoutGrid, MessageSquare, SlidersHorizontal, CalendarRange } from 'lucide-react';
import { useExpertAuth } from '../context/ExpertAuthContext';
import { AccountProfileButton } from '../components/AccountProfileRail';
import { MobileBottomNav, type MobileNavItem } from '../components/tezca/MobileBottomNav';
import { SessionLoading } from '../components/tezca/SessionLoading';
import { PageBreadcrumb } from '../components/tezca/PageBreadcrumb';
import { tezcaTheme } from '../lib/tezcaTheme';

function navStyle(active: boolean): CSSProperties {
  return active
    ? { background: tezcaTheme.accentGradient, color: tezcaTheme.text }
    : { color: tezcaTheme.textMuted };
}

const expertMobileNav: MobileNavItem[] = [
  { to: ROUTES.expert.customers.root, end: true, label: 'Danh sách khách hàng', shortLabel: 'KH', icon: LayoutGrid },
  { to: ROUTES.expert.doctorDesk, label: 'Doctor Desk', shortLabel: 'Desk', icon: MessageSquare },
  { to: ROUTES.expert.weeklyReport, label: 'Báo cáo tuần', shortLabel: 'Báo cáo', icon: CalendarRange },
  { to: ROUTES.expert.settings, label: 'Cài đặt', shortLabel: 'Cài đặt', icon: SlidersHorizontal },
];

export function ExpertLayout() {
  const { token, user, sessionReady, logout } = useExpertAuth();
  const { pathname } = useLocation();

  const loginTarget = ROUTES.expert.login;

  useEffect(() => {
    if (sessionReady && token && !user) logout();
  }, [sessionReady, token, user, logout]);

  if (!token) {
    return <Navigate to={loginTarget} replace state={{ from: pathname }} />;
  }

  if (sessionReady && !user) {
    return <Navigate to={loginTarget} replace state={{ from: pathname }} />;
  }

  if (!sessionReady || !user) {
    return <SessionLoading title="Đang tải phiên chuyên gia…" />;
  }

  return (
    <div className="min-h-screen flex flex-col xl:flex-row" style={{ backgroundColor: tezcaTheme.bg, color: tezcaTheme.text }}>
      <div className="flex-1 flex flex-col min-h-0 min-w-0 pb-[4.5rem] md:pb-0">
        <header
          className="border-b px-4 md:px-6 py-3 flex items-center justify-between gap-4 shrink-0"
          style={{ backgroundColor: tezcaTheme.sidebarSurface, borderColor: tezcaTheme.border }}
        >
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
            <Link
              to={ROUTES.home}
              className="text-lg font-semibold truncate no-underline"
              style={{ color: tezcaTheme.text }}
            >
              Tezca
            </Link>
            <span
              className="hidden md:inline w-px h-5 shrink-0"
              style={{ backgroundColor: tezcaTheme.border }}
              aria-hidden
            />
            <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
              <Link
                to={ROUTES.expert.customers.root}
                className="px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 no-underline"
                style={navStyle(pathname === ROUTES.expert.customers.root)}
              >
                <LayoutGrid size={14} aria-hidden />
                Danh sách khách hàng
              </Link>
              <Link
                to={ROUTES.expert.doctorDesk}
                className="px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 no-underline"
                style={navStyle(pathname.startsWith(ROUTES.expert.workspace.root))}
              >
                <MessageSquare size={14} aria-hidden />
                Doctor Desk
              </Link>
              <Link
                to={ROUTES.expert.weeklyReport}
                className="px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 no-underline"
                style={navStyle(pathname.startsWith(ROUTES.expert.weeklyReport))}
              >
                <CalendarRange size={14} aria-hidden />
                Báo cáo tuần
              </Link>
              <Link
                to={ROUTES.expert.settings}
                className="px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 no-underline"
                style={navStyle(pathname.startsWith(ROUTES.expert.settings))}
              >
                <SlidersHorizontal size={14} aria-hidden />
                Cài đặt
              </Link>
            </nav>
          </div>
          <AccountProfileButton
            role="expert"
            user={{ name: user.name, email: user.email }}
            onLogout={logout}
            compact
            className="max-w-[160px] shrink-0"
            buttonClassName="px-2 py-2 rounded-xl"
          />
        </header>
        <div className="flex-1 min-h-0 flex flex-col overflow-auto px-4 md:px-6 pt-4">
          <PageBreadcrumb pathname={pathname} />
          <Outlet />
        </div>
      </div>
      <div className="md:hidden">
        <MobileBottomNav items={expertMobileNav} />
      </div>
    </div>
  );
}
