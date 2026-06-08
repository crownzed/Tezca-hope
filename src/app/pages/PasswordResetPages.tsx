import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { KeyRound, Mail } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { ROUTES } from '../routes';
import { tezcaTheme } from '../lib/tezcaTheme';
import { FormAlert } from '../components/tezca/FormAlert';
import { AuthPrimaryButton, authInputClass, authInputStyle } from '../components/tezca/AuthFormCard';

function AuthShell({
  title,
  subtitle,
  children,
  backTo,
  backLabel,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  backTo: string;
  backLabel: string;
}) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: tezcaTheme.bg, color: tezcaTheme.text }}>
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 md:px-8 border-b backdrop-blur-md"
        style={{ backgroundColor: 'rgba(249,249,251,0.92)', borderColor: tezcaTheme.borderStrong }}
      >
        <Link to={ROUTES.home} className="flex items-center gap-2 font-semibold text-lg shrink-0">
          <span
            className="inline-flex w-8 h-8 rounded-lg items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: tezcaTheme.accentLight }}
          >
            T
          </span>
          <span>Tezca</span>
        </Link>
        <Link to={backTo} className="text-sm font-medium" style={{ color: tezcaTheme.accentDark }}>
          {backLabel}
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10 md:py-14">
        <div className="max-w-md w-full">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="inline-flex p-2 rounded-xl"
              style={{ backgroundColor: 'rgba(45,212,191,0.2)', color: tezcaTheme.accentDark }}
            >
              <KeyRound size={22} />
            </span>
            <h1 className="text-2xl font-bold m-0">{title}</h1>
          </div>
          <p className="text-sm opacity-75 m-0 mb-6">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    setDevResetUrl(null);
    try {
      const r = await apiFetch<{ message: string; resetUrl?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setDone(true);
      if (r.resetUrl) setDevResetUrl(r.resetUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Quên mật khẩu"
      subtitle="Nhập email đã đăng ký. Chúng tôi gửi liên kết đặt lại mật khẩu (hết hạn sau 1 giờ)."
      backTo={ROUTES.app.login}
      backLabel="← Đăng nhập"
    >
      <div
        className="rounded-2xl border p-6 md:p-8 shadow-xl"
        style={{ backgroundColor: tezcaTheme.surface, borderColor: tezcaTheme.border }}
      >
        {done ? (
          <>
            <p className="text-sm m-0 mb-4" style={{ color: tezcaTheme.text }}>
              Nếu email tồn tại trong hệ thống, bạn sẽ nhận hướng dẫn trong vài phút. Kiểm tra cả thư mục spam.
            </p>
            {devResetUrl && (
              <p className="text-xs m-0 mb-4 p-3 rounded-xl" style={{ backgroundColor: 'rgba(45,212,191,0.12)' }}>
                <strong>Môi trường dev:</strong>{' '}
                <a href={devResetUrl} className="break-all underline" style={{ color: tezcaTheme.accentDark }}>
                  Mở liên kết đặt lại mật khẩu
                </a>
              </p>
            )}
            <Link
              to={ROUTES.app.login}
              className="block w-full text-center rounded-full py-3 font-semibold no-underline"
              style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
            >
              Về đăng nhập
            </Link>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-medium">
              <span className="inline-flex items-center gap-1.5 mb-1">
                <Mail size={16} /> Email
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-xl border px-4 py-3 text-sm"
                style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.text }}
              />
            </label>
            {error && <FormAlert>{error}</FormAlert>}
            <AuthPrimaryButton disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi liên kết đặt lại'}</AuthPrimaryButton>
          </form>
        )}
      </div>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!tokenFromUrl) setError('Thiếu mã đặt lại. Hãy mở liên kết từ email hoặc yêu cầu liên kết mới.');
  }, [tokenFromUrl]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!tokenFromUrl) return;
    if (password !== confirm) {
      setError('Hai mật khẩu không khớp');
      return;
    }
    setBusy(true);
    try {
      await apiFetch<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: tokenFromUrl, password }),
      });
      navigate(ROUTES.app.login, {
        replace: true,
        state: { passwordReset: true },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Đặt mật khẩu mới"
      subtitle="Chọn mật khẩu mới cho tài khoản Tezca của bạn."
      backTo={ROUTES.auth.forgotPassword}
      backLabel="← Gửi lại liên kết"
    >
      <div
        className="rounded-2xl border p-6 md:p-8 shadow-xl"
        style={{ backgroundColor: tezcaTheme.surface, borderColor: tezcaTheme.border }}
      >
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium">
            Mật khẩu mới
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border px-4 py-3 text-sm"
              style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.text }}
            />
            <span className="block text-xs opacity-55 mt-1 font-normal">Ít nhất 8 ký tự</span>
          </label>
          <label className="block text-sm font-medium">
            Nhập lại mật khẩu
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-xl border px-4 py-3 text-sm"
              style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.text }}
            />
          </label>
          {error && <FormAlert>{error}</FormAlert>}
          <AuthPrimaryButton disabled={busy || !tokenFromUrl}>
            {busy ? 'Đang lưu…' : 'Lưu mật khẩu mới'}
          </AuthPrimaryButton>
        </form>
      </div>
    </AuthShell>
  );
}
