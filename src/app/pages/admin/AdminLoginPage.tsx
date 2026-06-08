import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ROUTES } from '../../routes';
import { useAdminAuth } from '../../context/AdminAuthContext';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, login, logout } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="rounded-2xl border p-6 bg-white max-w-md w-full space-y-3">
          <h1 className="text-xl font-semibold">Đã đăng nhập quản trị</h1>
          <p className="text-sm opacity-70">{user.email}</p>
          <div className="flex gap-2">
            <Link to={ROUTES.admin.dashboard} className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm">
              Vào Admin Console
            </Link>
            <button type="button" className="px-4 py-2 rounded-lg border text-sm" onClick={() => logout()}>
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    );
  }

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
