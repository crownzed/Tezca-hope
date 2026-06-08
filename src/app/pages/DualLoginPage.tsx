import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { resolveCustomerPostLoginPath } from '../lib/customerSessionGate';
import { Heart, Stethoscope, ArrowRight, ShieldCheck } from 'lucide-react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useExpertAuth } from '../context/ExpertAuthContext';
import { ROUTES } from '../routes';
import { tezcaTheme } from '../lib/tezcaTheme';
import { FormAlert } from '../components/tezca/FormAlert';
import { AuthFormCard, AuthPrimaryButton, authInputClass, authInputStyle } from '../components/tezca/AuthFormCard';

export function LoginHubPage() {
  const { hash } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (hash === '#benh-nhan' || hash === '#khach-hang') navigate(ROUTES.app.login, { replace: true });
    else if (hash === '#chuyen-gia') navigate(ROUTES.expert.login, { replace: true });
  }, [hash, navigate]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: tezcaTheme.bg, color: tezcaTheme.text }}>
      <header
        className="sticky top-0 z-30 flex flex-row items-center justify-between gap-3 px-4 py-3 md:px-8 border-b backdrop-blur-md"
        style={{ backgroundColor: 'rgba(249, 249, 251, 0.92)', borderColor: 'rgba(26, 32, 44, 0.1)' }}
      >
        <Link to={ROUTES.home} className="flex items-center gap-2 font-semibold text-lg shrink-0 min-w-0" style={{ color: '#1A202C' }}>
          <span
            className="inline-flex w-8 h-8 rounded-lg items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: '#2DD4BF' }}
          >
            T
          </span>
          <span>Tezca</span>
        </Link>
        <div className="flex flex-wrap items-center gap-3 shrink-0 justify-end">
          <Link to={ROUTES.expert.login} className="text-sm font-medium whitespace-nowrap" style={{ color: '#0F766E' }}>
            Chuyên gia →
          </Link>
          <Link to={ROUTES.admin.login} className="text-sm font-medium whitespace-nowrap" style={{ color: '#0F766E' }}>
            Quản trị →
          </Link>
        </div>
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
            <p className="text-sm opacity-70 m-0 mb-3">Doctor Desk & theo dõi BN.</p>
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

export function CustomerLoginPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F9F9FB', color: '#1A202C' }}>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 md:px-8 border-b backdrop-blur-md" style={{ backgroundColor: 'rgba(249,249,251,0.92)', borderColor: 'rgba(26,32,44,0.1)' }}>
        <Link to={ROUTES.home} className="flex items-center gap-2 font-semibold text-lg shrink-0 min-w-0">
          <span className="inline-flex w-8 h-8 rounded-lg items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#2DD4BF' }}>T</span>
          <span>Tezca</span>
        </Link>
        <div className="flex flex-wrap gap-2 shrink-0 justify-end">
          <Link to={ROUTES.expert.login} className="text-sm font-medium" style={{ color: '#0F766E' }}>
            Chuyên gia →
          </Link>
        </div>
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
            BMI, nhật ký, Tezca AI và chat với chuyên gia được gán. Sau đăng nhập bạn vào ứng dụng khách hàng.
          </p>
          <CustomerLoginPanel />
        </div>
      </main>
    </div>
  );
}

function CustomerLoginPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, register, logout } = useCustomerAuth();
  const passwordResetDone = Boolean((location.state as { passwordReset?: boolean } | null)?.passwordReset);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) {
    return (
      <div
        className="rounded-2xl border p-6 md:p-8 shadow-xl"
        style={{ backgroundColor: 'white', borderColor: 'rgba(26, 32, 44, 0.08)' }}
      >
        <h2 className="text-lg font-semibold m-0 mb-2" style={{ color: '#1A202C' }}>
          Đã đăng nhập khách hàng
        </h2>
        <p className="text-sm opacity-80 m-0 mb-4" style={{ color: '#1A202C' }}>
          <strong>{user.name}</strong>
          <span className="opacity-60"> · {user.email}</span>
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            to={ROUTES.app.dashboard}
            className="inline-flex justify-center rounded-full py-3 px-4 font-semibold text-white text-center no-underline"
            style={{ background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)' }}
          >
            Vào ứng dụng
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-full py-3 px-4 font-medium border text-sm"
            style={{ borderColor: 'rgba(26, 32, 44, 0.15)', color: '#1A202C' }}
          >
            Đăng xuất khách hàng
          </button>
        </div>
        <Link to={ROUTES.expert.login} className="text-xs opacity-60 mt-4 inline-block" style={{ color: '#0F766E' }}>
          Đăng nhập chuyên gia (phiên riêng)
        </Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
          <input
            type="password"
            required
            minLength={mode === 'register' ? 8 : undefined}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
            style={authInputStyle()}
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
        {error && <FormAlert>{error}</FormAlert>}
        <AuthPrimaryButton disabled={busy}>
          {busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </AuthPrimaryButton>
      </form>
      <button
        type="button"
        className="mt-4 text-sm w-full text-center opacity-70 hover:opacity-100 bg-transparent border-0 cursor-pointer"
        style={{ color: '#1A202C' }}
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
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

export function ExpertLoginPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: tezcaTheme.bg, color: tezcaTheme.text }}>
      <header
        className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 md:px-8 border-b backdrop-blur-md"
        style={{ backgroundColor: 'rgba(249,249,251,0.92)', borderColor: tezcaTheme.borderStrong }}
      >
        <Link to={ROUTES.home} className="flex items-center gap-2 font-semibold text-lg shrink-0 min-w-0">
          <span
            className="inline-flex w-8 h-8 rounded-lg items-center justify-center text-white text-sm font-bold"
            style={{ backgroundColor: tezcaTheme.accentLight }}
          >
            T
          </span>
          <span>Tezca</span>
        </Link>
        <div className="flex gap-3 shrink-0">
          <Link to={ROUTES.app.login} className="text-sm font-medium" style={{ color: tezcaTheme.accentDark }}>
            Khách hàng →
          </Link>
        </div>
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
  const { user, login, logout } = useExpertAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) {
    return (
      <div
        className="rounded-2xl border p-6 md:p-8 shadow-xl"
        style={{ backgroundColor: tezcaTheme.surface, borderColor: tezcaTheme.border }}
      >
        <h2 className="text-lg font-semibold m-0 mb-2">Đã đăng nhập chuyên gia</h2>
        <p className="text-sm opacity-80 m-0 mb-4">
          <strong>{user.name}</strong>
          <span className="opacity-60"> · {user.email}</span>
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            to={ROUTES.expert.doctorDesk}
            className="inline-flex justify-center rounded-full py-3 px-4 font-semibold text-center no-underline"
            style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
          >
            Mở Doctor Desk
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-full py-3 px-4 font-medium border text-sm"
            style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.text }}
          >
            Đăng xuất chuyên gia
          </button>
        </div>
        <Link to={ROUTES.app.login} className="text-xs opacity-60 mt-4 inline-block" style={{ color: tezcaTheme.accentDark }}>
          Đăng nhập khách hàng (phiên riêng)
        </Link>
      </div>
    );
  }

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
          : ROUTES.expert.doctorDesk;
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
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
            style={authInputStyle()}
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
