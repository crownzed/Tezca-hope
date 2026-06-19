import { Navigate, Outlet, useLocation } from 'react-router';
import { ROUTES } from '../routes';
import { useAnyCommunitySession } from '../lib/useCommunitySession';
import { SessionLoading } from '../components/tezca/SessionLoading';

export function CommunityGate() {
  const { isAuthenticated, isVerifying } = useAnyCommunitySession();
  const { pathname } = useLocation();

  if (isVerifying) {
    return <SessionLoading title="Đang xác thực tài khoản…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.auth.hub} replace state={{ from: pathname }} />;
  }

  return <Outlet />;
}
