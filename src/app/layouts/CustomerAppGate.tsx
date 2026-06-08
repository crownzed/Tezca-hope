import { Navigate, Outlet, useLocation } from 'react-router';
import { ROUTES } from '../routes';
import { customerRouteRequiresAuth, useCustomerSession } from '../lib/customerSessionGate';
import { SessionLoading } from '../components/tezca/SessionLoading';

/**
 * Gate nội dung /app: route guest vs bắt buộc đăng nhập.
 * Trung tâm Kỷ luật và hầu hết mục cho phép anonymous; chat chuyên gia thì không.
 */
export function CustomerAppGate() {
  const { phase } = useCustomerSession();
  const { pathname } = useLocation();
  const requiresAuth = customerRouteRequiresAuth(pathname);
  const loginTarget = ROUTES.app.login;

  if (requiresAuth) {
    if (phase === 'verifying') {
      return <SessionLoading title="Đang xác thực tài khoản…" />;
    }
    if (phase !== 'authenticated') {
      return <Navigate to={loginTarget} replace state={{ from: pathname }} />;
    }
    return <Outlet />;
  }

  return <Outlet />;
}
