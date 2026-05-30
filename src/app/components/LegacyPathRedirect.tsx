import { Navigate, useLocation, useParams } from 'react-router';
import {
  LEGACY_APP_REDIRECTS,
  LEGACY_EXPERT_REDIRECTS,
  ROUTES,
  expertCustomerPath,
  expertDoctorDeskPath,
} from '../routes';

/** Redirect path phẳng cũ → path phân cấp mới */
export function LegacyAppRedirect() {
  const { pathname } = useLocation();
  const target = LEGACY_APP_REDIRECTS[pathname];
  if (target) return <Navigate to={target} replace />;
  return <Navigate to="/app/trung-tam-ky-luat" replace />;
}

/** /app/cong-dong → /cong-dong/... */
export function LegacyAppCommunityRedirect() {
  const { pathname, search } = useLocation();
  const tab = new URLSearchParams(search).get('tab');
  if (tab === 'rooms' || pathname.includes('/phong-chat')) {
    return <Navigate to={ROUTES.community.rooms} replace />;
  }
  return <Navigate to={ROUTES.community.forum} replace />;
}

export function LegacyExpertRedirect() {
  const { pathname } = useLocation();
  const target = LEGACY_EXPERT_REDIRECTS[pathname];
  if (target) return <Navigate to={target} replace />;
  return <Navigate to="/expert/khach-hang" replace />;
}

export function LegacyExpertDoctorDeskCustomerRedirect() {
  const { customerId } = useParams();
  if (!customerId) return <Navigate to="/expert/ban-lam-viec" replace />;
  return <Navigate to={expertDoctorDeskPath(customerId)} replace />;
}

export function LegacyExpertPatientRedirect() {
  const { customerId } = useParams();
  if (!customerId) return <Navigate to="/expert/khach-hang" replace />;
  return <Navigate to={expertCustomerPath(customerId)} replace />;
}

export function PrefixAliasRedirect({ fromPrefix, toPrefix }: { fromPrefix: string; toPrefix: string }) {
  const { pathname, search, hash } = useLocation();
  if (!pathname.startsWith(fromPrefix)) return null;
  const rest = pathname.slice(fromPrefix.length) || '';
  return <Navigate to={`${toPrefix}${rest}${search}${hash}`} replace />;
}
