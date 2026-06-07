import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { resolveCustomerPostLoginPath } from '../lib/customerSessionGate';
import { Heart, Stethoscope, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useExpertAuth } from '../context/ExpertAuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useAnyCommunitySession } from '../lib/useCommunitySession';
import { ROUTES } from '../routes';
import { tezcaTheme } from '../lib/tezcaTheme';
import { FormAlert } from '../components/tezca/FormAlert';
import { AuthFormCard, AuthPrimaryButton, authInputClass, authInputStyle } from '../components/tezca/AuthFormCard';
import { SessionLoading } from '../components/tezca/SessionLoading';
import { TezcaLogoLink } from '../components/TezcaLogo';

/** Trả về URL portal tương ứng với role đang đăng nhập, hoặc null nếu chưa đăng nhập. */
function useActivePortal(): { ready: boolean; portal: string | null } {
  const { isAuthenticated, isVerifying, role } = useAnyCommunitySession();
  if (isVerifying) return { ready: false, portal: null };
  if (!isAuthenticated) return { ready: true, portal: null };
  if (role === 'expert') return { ready: true, portal: ROUTES.expert.customers.root };
  if (role === 'admin') return { ready: true, portal: ROUTES.admin.dashboard };
  return { ready: true, portal: ROUTES.app.dashboard };
}

// ─── Hub ─────────────────────────────────────────────────────────────────────

export function LoginHubPage() {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const { ready, portal } = useActivePortal();

  useEffect(() => {
    if (hash === '#benh-nhan' || hash === '#khach-hang') navigate(ROUTES.app.login, { replace: true });
    else if (hash === '#chuyen-gia') navigate(ROUTES.expert.login, { replace: true });
  }, [hash, navigate]);

  if (!ready) return <SessionLoading title="Đang kiểm tra phiên…" />;
  if (portal) return <Navigate to={portal} replace />;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: tezcaTheme.bg, color: tezcaTheme.text }}>
      <header
        className="sticky top-0 z-30 flex flex-row items-center justify-between gap-3 px-4 py-3 md:px-8 border-b backdrop-blur-md"
        style={{ backgroundColor: 'rgba(249, 249, 251, 0.92)', borderColor: 'rgba(26, 32, 44, 0.1)' }}
      >
        <TezcaLogoLink to={ROUTES.home} size="md" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <h1 className="text-2xl md:text-3xl font-bold m-0 mb-2 text-center">Chọn cổng đăng nhập</h1>
        <p className="text-sm opacity-70 m-0 mb-10 text-center max-w-md">Khách hàng và chuyên gia có giao diện riêng.</p>
        <div className="grid sm:grid-cols-2 gap-4 w-full max-w-2xl">
          <Link
            to={ROUTES.app.login}
            className="rounded-2xl border p-6 no-underline hover:shadow-lg bg-white"
            style={{ borderColor: 'rgba(26,32,44,0.1)', color: '#1A202C' }}
          >
            <span className="inline-flex p-2 rounded-xl mb-3" style={{ backgroundColor: 'rgba(45,212,191,0.2)', color: '#0F766E' }}>
              <Heart size={24} />
            </span>
            <h2 className="text-lg font-bold m-0 mb-1">Khách hàng</h2>
            <p className="text-sm opacity-70 m-0 mb-3">BMI, nhật ký, Tezca AI và ứng dụng sức khỏe.</p>
            <span className="text-sm font-semibold inline-flex items-center gap-1" style={{ color: '#0F766E' }}>
              Đăng nhập <ArrowRight size={16} />
            </span>
          </Link>
          <Link
            to={ROUTES.expert.login}
            className="rounded-2xl border p-6 no-underline hover:shadow-lg bg-white"
            style={{ borderColor: tezcaTheme.border, color: tezcaTheme.text }}
          >
            <span
              className="inline-flex p-2 rounded-xl mb-3"
              style={{ backgroundColor: 'rgba(45,212,191,0.2)', color: tezcaTheme.accentDark }}
            >
              <Stethoscope size={24} />
            </span>
            <h2 className="text-lg font-bold m-0 mb-1">Chuyên gia</h2>
            <p className="text-sm opacity-70 m-0 mb-3">Doctor Desk & theo dõi khách hàng.</p>
            <span className="text-sm font-semibold inline-flex items-center gap-1" style={{ color: tezcaTheme.accentDark }}>
              Đăng nhập <ArrowRight size={16} />
            </span>
          </Link>
          <Link
            to={ROUTES.admin.login}
            className="rounded-2xl border p-6 no-underline hover:shadow-lg bg-white sm:col-span-2"
            style={{ borderColor: tezcaTheme.border, color: tezcaTheme.text }}
          >
            <span className="inline-flex p-2 rounded-xl mb-3" style={{ backgroundColor: 'rgba(45,212,191,0.2)', color: tezcaTheme.accentDark }}>
              <ShieldCheck size={24} />
            </span>
            <h2 className="text-lg font-bold m-0 mb-1">Quản trị viên</h2>
            <p className="text-sm opacity-70 m-0 mb-3">Quản lý hồ sơ, phân quyền và gán chuyên gia - khách hàng.</p>
            <span className="text-sm font-semibold inline-flex items-center gap-1" style={{ color: tezcaTheme.accentDark }}>
              Đăng nhập <ArrowRight size={16} />
            </span>
          </Link>
        </div>
      </main>
    </div>
  );
}

export const DualLoginPage = LoginHubPage;

// ─── Khách hàng ───────────────────────────────────────────────────────────────

export function CustomerLoginPage() {
  const { ready, portal } = useActivePortal();

  if (!ready) return <SessionLoading title="Đang kiểm tra phiên…" />;
  if (portal) return <Navigate to={portal} replace />;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F9F9FB', color: '#1A202C' }}>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 md:px-8 border-b backdrop-blur-md" style={{ backgroundColor: 'rgba(249,249,251,0.92)', borderColor: 'rgba(26,32,44,0.1)' }}>
        <TezcaLogoLink to={ROUTES.home} size="md" />
        <Link to={ROUTES.auth.hub} className="text-sm opacity-60 hover:opacity-100" style={{ color: '#1A202C' }}>
          ← Cổng đăng nhập
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10 md:py-14">
        <div className="max-w-md w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex p-2 rounded-xl" style={{ backgroundColor: 'rgba(45,212,191,0.2)', color: '#0F766E' }}>
              <Heart size={22} />
            </span>
            <h1 className="text-2xl font-bold m-0">Người dùng & khách hàng</h1>
          </div>
          <p className="text-sm opacity-75 m-0 mb-6">
            BMI, nhật ký, Tezca AI và chat với chuyên gia được gán.
          </p>
          <CustomerLoginPanel />
        </div>
      </main>
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  autoComplete,
  required,
  minLength,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative mt-1">
      <input
        type={show ? 'text' : 'password'}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={authInputClass}
        style={{ ...authInputStyle(), paddingRight: '2.5rem' }}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 border-0 bg-transparent cursor-pointer p-0 opacity-50 hover:opacity-90"
        aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function CustomerLoginPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useCustomerAuth();
  const passwordResetDone = Boolean((location.state as { passwordReset?: boolean } | null)?.passwordReset);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'register') {
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không khớp. Vui lòng nhập lại.');
        return;
      }
      if (password.trim().length < 8) {
        setError('Mật khẩu cần ít nhất 8 ký tự (không chỉ khoảng trắng).');
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, name || undefined);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(resolveCustomerPostLoginPath(from), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFormCard title={mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}>
      {passwordResetDone && mode === 'login' && (
        <FormAlert variant="success" className="mb-4">
          Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới.
        </FormAlert>
      )}
      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' && (
          <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
            Tên hiển thị
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={authInputClass}
              style={authInputStyle()}
              autoComplete="name"
            />
          </label>
        )}
        <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
            style={authInputStyle()}
            autoComplete="email"
          />
        </label>
        <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
          Mật khẩu
          <PasswordInput
            value={password}
            onChange={setPassword}
            required
            minLength={mode === 'register' ? 8 : undefined}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />
          {mode === 'register' && (
            <span className="block text-xs opacity-55 mt-1 font-normal">Ít nhất 8 ký tự</span>
          )}
          {mode === 'login' && (
            <Link
              to={ROUTES.auth.forgotPassword}
              className="block text-xs mt-2 font-normal no-underline hover:underline"
              style={{ color: tezcaTheme.accentDark }}
            >
              Quên mật khẩu?
            </Link>
          )}
        </label>
        {mode === 'register' && (
          <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
            Xác nhận mật khẩu
            <PasswordInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
              minLength={8}
              autoComplete="new-password"
            />
            {confirmPassword && password !== confirmPassword && (
              <span className="block text-xs mt-1 font-normal" style={{ color: '#e53e3e' }}>
                Mật khẩu không khớp
              </span>
            )}
          </label>
        )}
        {error && <FormAlert>{error}</FormAlert>}
        {error && (error.includes('quản trị') || error.includes('chuyên gia')) && (
          <p className="text-xs m-0 -mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {error.includes('chuyên gia') && (
              <Link to={ROUTES.expert.login} className="font-medium underline" style={{ color: tezcaTheme.accentDark }}>
                Cổng chuyên gia
              </Link>
            )}
            {error.includes('quản trị') && (
              <Link to={ROUTES.admin.login} className="font-medium underline" style={{ color: tezcaTheme.accentDark }}>
                Cổng quản trị
              </Link>
            )}
          </p>
        )}
        <AuthPrimaryButton disabled={busy || (mode === 'register' && confirmPassword !== '' && password !== confirmPassword)}>
          {busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </AuthPrimaryButton>
      </form>
      <button
        type="button"
        className="mt-4 text-sm w-full text-center opacity-70 hover:opacity-100 bg-transparent border-0 cursor-pointer"
        style={{ color: '#1A202C' }}
        onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
      >
        {mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
      </button>
      <p className="text-xs text-center mt-5 opacity-50 leading-relaxed m-0" style={{ color: '#1A202C' }}>
        Tiếp tục nghĩa là bạn đã xem{' '}
        <Link to={ROUTES.legal.terms} className="underline underline-offset-2" style={{ color: '#0F766E' }}>
          Điều khoản
        </Link>{' '}
        và{' '}
        <Link to={ROUTES.legal.privacy} className="underline underline-offset-2" style={{ color: '#0F766E' }}>
          Chính sách bảo mật
        </Link>
        .
      </p>
    </AuthFormCard>
  );
}

// ─── Chuyên gia ───────────────────────────────────────────────────────────────

export function ExpertLoginPage() {
  const { ready, portal } = useActivePortal();

  if (!ready) return <SessionLoading title="Đang kiểm tra phiên…" />;
  if (portal) return <Navigate to={portal} replace />;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: tezcaTheme.bg, color: tezcaTheme.text }}>
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 md:px-8 border-b backdrop-blur-md"
        style={{ backgroundColor: 'rgba(249,249,251,0.92)', borderColor: tezcaTheme.borderStrong }}
      >
        <TezcaLogoLink to={ROUTES.home} size="md" />
        <Link to={ROUTES.auth.hub} className="text-sm opacity-60 hover:opacity-100" style={{ color: tezcaTheme.text }}>
          ← Cổng đăng nhập
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10 md:py-14">
        <div className="max-w-md w-full">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="inline-flex p-2 rounded-xl"
              style={{ backgroundColor: 'rgba(45,212,191,0.2)', color: tezcaTheme.accentDark }}
            >
              <Stethoscope size={22} />
            </span>
            <h1 className="text-2xl font-bold m-0">Chuyên gia đồng hành</h1>
          </div>
          <p className="text-sm opacity-75 m-0 mb-6">Dashboard khách hàng được gán và chat trực tiếp.</p>
          <ExpertLoginPanel />
        </div>
      </main>
    </div>
  );
}

function ExpertLoginPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useExpertAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      const from = (location.state as { from?: string } | null)?.from;
      const target =
        typeof from === 'string' && from.startsWith('/expert') && !from.startsWith('//')
          ? from
          : ROUTES.expert.customers.root;
      navigate(target, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFormCard title="Đăng nhập dashboard">
      <p className="text-xs opacity-55 m-0 mb-4 -mt-2">
        Demo: <code style={{ color: tezcaTheme.accentDark }}>expert@tezca.vn</code> /{' '}
        <code style={{ color: tezcaTheme.accentDark }}>TezcaDemo#2026</code>
      </p>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
            style={authInputStyle()}
            autoComplete="email"
          />
        </label>
        <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
          Mật khẩu
          <PasswordInput
            value={password}
            onChange={setPassword}
            required
            autoComplete="current-password"
          />
          <Link
            to={ROUTES.auth.forgotPassword}
            className="block text-xs mt-2 font-normal no-underline hover:underline"
            style={{ color: tezcaTheme.accentDark }}
          >
            Quên mật khẩu?
          </Link>
        </label>
        {error && <FormAlert>{error}</FormAlert>}
        {error && (error.includes('quản trị') || error.includes('khách hàng')) && (
          <p className="text-xs m-0 -mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {error.includes('khách hàng') && (
              <Link to={ROUTES.app.login} className="font-medium underline" style={{ color: tezcaTheme.accentDark }}>
                Cổng khách hàng
              </Link>
            )}
            {error.includes('quản trị') && (
              <Link to={ROUTES.admin.login} className="font-medium underline" style={{ color: tezcaTheme.accentDark }}>
                Cổng quản trị
              </Link>
            )}
          </p>
        )}
        <AuthPrimaryButton disabled={busy}>
          {busy ? 'Đang xử lý…' : 'Đăng nhập chuyên gia'}
        </AuthPrimaryButton>
      </form>
      <Link to={ROUTES.home} className="block text-center text-sm mt-5 opacity-60 no-underline" style={{ color: tezcaTheme.accentDark }}>
        Về trang chủ
      </Link>
    </AuthFormCard>
  );
}
