import { Link, Navigate, Outlet } from 'react-router';
import { ROUTES } from '../routes';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { tezcaTheme } from '../lib/tezcaTheme';

export function AdminLayout() {
  const { user, sessionReady, logout } = useAdminAuth();
  if (!sessionReady) {
    return <div className="p-8 text-sm opacity-70">Đang kiểm tra phiên quản trị…</div>;
  }
  if (!user) {
    return <Navigate to={ROUTES.admin.login} replace />;
  }
  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ backgroundColor: tezcaTheme.bg, color: tezcaTheme.text }}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header
          className="border-b px-5 py-3 flex items-center justify-between shrink-0"
          style={{ backgroundColor: tezcaTheme.surface, borderColor: tezcaTheme.border }}
        >
          <div>
            <p className="font-semibold m-0 text-sm">Tezca Admin Console</p>
            <p className="text-xs opacity-60 m-0 mt-0.5">{user.email}</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link to={ROUTES.home} className="underline opacity-80 hover:opacity-100">
              Trang chủ
            </Link>
            <button type="button" className="border-0 bg-transparent cursor-pointer opacity-80 hover:opacity-100 p-0" onClick={() => logout()}>
              Đăng xuất
            </button>
          </div>
        </header>
        <main className="flex-1 p-5 md:p-8 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
