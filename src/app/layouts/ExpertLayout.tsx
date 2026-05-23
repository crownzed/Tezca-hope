import { useEffect, type CSSProperties } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { ROUTES } from '../routes';
import { LogOut, LayoutGrid, MessageSquare, SlidersHorizontal, CalendarRange } from 'lucide-react';
import { useExpertAuth } from '../context/ExpertAuthContext';
import { tezcaTheme } from '../lib/tezcaTheme';

function navStyle(active: boolean): CSSProperties {
  return active
    ? { background: tezcaTheme.accentGradient, color: tezcaTheme.text }
    : { color: tezcaTheme.textMuted };
}

export function ExpertLayout() {
  const { token, user, sessionReady, logout } = useExpertAuth();
  const navigate = useNavigate();
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
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-2 px-4"
        style={{ backgroundColor: tezcaTheme.bg, color: tezcaTheme.textMuted }}
      >
        <p className="text-sm font-medium m-0" style={{ color: tezcaTheme.text }}>
          Đang tải phiên chuyên gia…
        </p>
        <p className="text-xs m-0 text-center max-w-sm">Nếu treo lâu, hãy bật API và tải lại trang.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: tezcaTheme.bg, color: tezcaTheme.text }}>
      <header
        className="border-b px-4 md:px-6 py-3 flex items-center justify-between gap-4 shrink-0"
        style={{ backgroundColor: tezcaTheme.sidebarSurface, borderColor: tezcaTheme.border }}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
          <Link
            to={ROUTES.home}
            className="text-sm whitespace-nowrap hidden sm:inline opacity-70 hover:opacity-100"
            style={{ color: tezcaTheme.text }}
          >
            Trang chủ
          </Link>
          <Link to={ROUTES.expert.root} className="text-lg font-semibold truncate" style={{ color: tezcaTheme.text }}>
            Tezca · Chuyên gia
          </Link>
          <span
            className="hidden md:inline w-px h-5 shrink-0"
            style={{ backgroundColor: tezcaTheme.border }}
            aria-hidden
          />
          <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
            <Link
              to={ROUTES.expert.root}
              className="px-2.5 py-1.5 rounded-xl flex items-center gap-1.5"
              style={navStyle(pathname === ROUTES.expert.root)}
            >
              <LayoutGrid size={14} />
              Danh sách
            </Link>
            <Link
              to={ROUTES.expert.doctorDesk}
              className="px-2.5 py-1.5 rounded-xl flex items-center gap-1.5"
              style={navStyle(pathname.startsWith('/expert/doctor-desk'))}
            >
              <MessageSquare size={14} />
              Doctor Desk
            </Link>
            <Link
              to={ROUTES.expert.weeklyReport}
              className="px-2.5 py-1.5 rounded-xl flex items-center gap-1.5"
              style={navStyle(pathname.startsWith(ROUTES.expert.weeklyReport))}
            >
              <CalendarRange size={14} />
              Báo cáo tuần
            </Link>
            <Link
              to={ROUTES.expert.settings}
              className="px-2.5 py-1.5 rounded-xl flex items-center gap-1.5"
              style={navStyle(pathname.startsWith(ROUTES.expert.settings))}
            >
              <SlidersHorizontal size={14} />
              Cài đặt
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs max-w-[140px] truncate hidden md:inline" style={{ color: tezcaTheme.textMuted }}>
            {user.name}
          </span>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate(loginTarget);
            }}
            className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm border hover:opacity-90"
            style={{ borderColor: tezcaTheme.border, color: tezcaTheme.text }}
          >
            <LogOut size={16} />
            Thoát
          </button>
        </div>
      </header>
      <div className="flex-1 min-h-0 flex flex-col overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
