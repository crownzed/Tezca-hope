import { useEffect } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { ROUTES } from '../routes';
import { LogOut, LayoutGrid, MessageSquare, SlidersHorizontal } from 'lucide-react';
import { useExpertAuth } from '../context/ExpertAuthContext';

export function ExpertLayout() {
  const { token, user, sessionReady, logout } = useExpertAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const loginTarget = { pathname: ROUTES.auth.hub, hash: '#chuyen-gia' } as const;

  useEffect(() => {
    if (sessionReady && token && !user) logout();
  }, [sessionReady, token, user, logout]);

  if (!token) {
    return <Navigate to={loginTarget} replace />;
  }

  if (sessionReady && !user) {
    return <Navigate to={loginTarget} replace />;
  }

  if (!sessionReady || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400 gap-2 px-4">
        <p className="text-sm font-medium text-slate-300 m-0">Đang tải phiên chuyên gia…</p>
        <p className="text-xs text-slate-500 m-0 text-center max-w-sm">Nếu treo lâu, hãy bật API và tải lại trang.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200">
      <header className="border-b border-slate-800 px-4 md:px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-wrap">
          <Link to={ROUTES.home} className="text-sm text-slate-500 hover:text-teal-400 whitespace-nowrap hidden sm:inline">
            Trang chủ
          </Link>
          <Link to={ROUTES.expert.root} className="text-lg font-semibold text-white truncate">
            Tezca · Chuyên gia
          </Link>
          <span className="hidden md:inline w-px h-5 bg-slate-700 shrink-0" aria-hidden />
          <nav className="hidden md:flex items-center gap-1 text-xs font-medium">
            <Link
              to={ROUTES.expert.root}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 ${
                pathname === ROUTES.expert.root
                  ? 'text-white bg-slate-800'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <LayoutGrid size={14} />
              Danh sách
            </Link>
            <Link
              to={ROUTES.expert.doctorDesk}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 ${
                pathname.startsWith('/expert/doctor-desk')
                  ? 'text-white bg-slate-800'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <MessageSquare size={14} />
              Doctor Desk
            </Link>
            <Link
              to={ROUTES.expert.settings}
              className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 ${
                pathname.startsWith(ROUTES.expert.settings)
                  ? 'text-white bg-slate-800'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <SlidersHorizontal size={14} />
              Cài đặt
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-500 max-w-[140px] truncate hidden md:inline">{user.name}</span>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate(loginTarget);
            }}
            className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm border border-slate-700 hover:bg-slate-800"
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
