import { Navigate, Outlet, useLocation } from 'react-router';
import { ROUTES } from '../routes';
import { tezcaTheme } from '../lib/tezcaTheme';
import { patientRouteRequiresAuth, usePatientSession } from '../lib/patientSessionGate';

function SessionVerifyingScreen() {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 min-h-[40vh] px-4"
      style={{ color: tezcaTheme.textMuted }}
    >
      <p className="text-sm font-medium m-0" style={{ color: tezcaTheme.text }}>
        Đang xác thực tài khoản…
      </p>
      <p className="text-xs m-0 text-center max-w-sm opacity-80">
        Nếu treo lâu, hãy bật API (`npm run dev:all`) và tải lại trang.
      </p>
    </div>
  );
}

/**
 * Gate nội dung /app: route guest vs bắt buộc đăng nhập.
 * Trung tâm Kỷ luật và hầu hết mục cho phép anonymous; chat chuyên gia thì không.
 */
export function PatientAppGate() {
  const { phase } = usePatientSession();
  const { pathname } = useLocation();
  const requiresAuth = patientRouteRequiresAuth(pathname);
  const loginTarget = ROUTES.app.login;

  if (requiresAuth) {
    if (phase === 'verifying') return <SessionVerifyingScreen />;
    if (phase !== 'authenticated') {
      return <Navigate to={loginTarget} replace state={{ from: pathname }} />;
    }
    return <Outlet />;
  }

  if (phase === 'verifying') return <SessionVerifyingScreen />;

  return <Outlet />;
}
