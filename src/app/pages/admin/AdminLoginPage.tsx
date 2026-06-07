import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { ROUTES } from '../../routes';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useAnyCommunitySession } from '../../lib/useCommunitySession';
import { SessionLoading } from '../../components/tezca/SessionLoading';

function useActivePortal(): { ready: boolean; portal: string | null } {
  const { isAuthenticated, isVerifying, role } = useAnyCommunitySession();
  if (isVerifying) return { ready: false, portal: null };
  if (!isAuthenticated) return { ready: true, portal: null };
  if (role === 'expert') return { ready: true, portal: ROUTES.expert.customers.root };
  if (role === 'admin') return { ready: true, portal: ROUTES.admin.dashboard };
  return { ready: true, portal: ROUTES.app.dashboard };
}

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { login } = useAdminAuth();
  const { ready, portal } = useActivePortal();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!ready) return <SessionLoading title="Đang kiểm tra phiên…" />;
  if (portal) return <Navigate to={portal} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate(ROUTES.admin.dashboard, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đăng nhập được');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <form onSubmit={submit} className="rounded-2xl border p-6 bg-white max-w-md w-full space-y-4">
        <h1 className="text-xl font-semibold">Đăng nhập quản trị</h1>
        <label className="block text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 border rounded-lg px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          Mật khẩu
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 border rounded-lg px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-teal-600 text-white py-2 text-sm">
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập Admin'}
        </button>
        <Link to={ROUTES.auth.hub} className="text-xs underline block text-center">
          Quay lại cổng đăng nhập
        </Link>
      </form>
    </div>
  );
}
