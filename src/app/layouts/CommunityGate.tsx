import { Navigate, Outlet, useLocation } from 'react-router';
import { ROUTES } from '../routes';
import { useAnyCommunitySession } from '../lib/useCommunitySession';
import { SessionLoading } from '../components/tezca/SessionLoading';

/**
 * Gate cộng đồng — cho phép bất kỳ user đã xác thực (customer / expert / admin).
 * Nếu đang xác minh → hiển thị loading.
 * Nếu chưa đăng nhập → redirect đến auth hub.
 */
export function CommunityGate() {
  const { isAuthenticated, isVerifying } = useAnyCommunitySession();
  const { pathname } = useLocation();

  if (isVerifying) {
    return <SessionLoading title="Đang xác thực phiên…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.auth.hub} replace state={{ from: pathname }} />;
  }

  return <Outlet />;
}
