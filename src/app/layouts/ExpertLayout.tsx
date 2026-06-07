import { useEffect } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { ROUTES } from '../routes';
import { useExpertAuth } from '../context/ExpertAuthContext';
import { ExpertSidebar } from '../components/expert/ExpertSidebar';
import { SessionLoading } from '../components/tezca/SessionLoading';
import { tezcaTheme } from '../lib/tezcaTheme';
import { TezcaLogoLink } from '../components/TezcaLogo';

export function ExpertLayout() {
  const { token, user, sessionReady, logout } = useExpertAuth();
  const { pathname } = useLocation();

  const loginTarget = ROUTES.expert.login;
  const deskMode = pathname.startsWith(ROUTES.expert.workspace.root);

  useEffect(() => {
    if (sessionReady && token && !user) logout();
  }, [sessionReady, token, user, logout]);

  if (!token) return <Navigate to={loginTarget} replace state={{ from: pathname }} />;
  if (sessionReady && !user) return <Navigate to={loginTarget} replace state={{ from: pathname }} />;
  if (!sessionReady || !user) return <SessionLoading title="Đang tải phiên chuyên gia…" />;

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ backgroundColor: tezcaTheme.bg, color: tezcaTheme.text }}>
      <ExpertSidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header
          className="border-b px-5 py-3 flex items-center justify-between shrink-0"
          style={{ backgroundColor: tezcaTheme.surface, borderColor: tezcaTheme.border }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <TezcaLogoLink to={ROUTES.home} variant="mark" size="sm" className="shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold m-0 text-sm">Bàn chuyên gia</p>
              <p className="text-xs opacity-60 m-0 mt-0.5 truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link to={ROUTES.home} className="underline opacity-80 hover:opacity-100">
              Trang chủ
            </Link>
            <button
              type="button"
              className="border-0 bg-transparent cursor-pointer opacity-80 hover:opacity-100 p-0"
              onClick={() => logout()}
            >
              Đăng xuất
            </button>
          </div>
        </header>
        <main
          className={
            deskMode
              ? 'flex-1 min-h-0 flex flex-col overflow-hidden'
              : 'flex-1 p-5 md:p-8 overflow-x-hidden'
          }
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
