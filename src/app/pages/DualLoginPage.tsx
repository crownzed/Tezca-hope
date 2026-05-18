import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { Heart, Stethoscope, ArrowRight } from 'lucide-react';
import { usePatientAuth } from '../context/PatientAuthContext';
import { useExpertAuth } from '../context/ExpertAuthContext';
import { ROUTES } from '../routes';

export function LoginHubPage() {
  const { hash } = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (hash === '#benh-nhan') navigate(ROUTES.app.login, { replace: true });
    else if (hash === '#chuyen-gia') navigate(ROUTES.expert.login, { replace: true });
  }, [hash, navigate]);

  return (
    <div className="min-h-screen flex flex-col" style={{ color: '#1A202C' }}>
      <header
        className="sticky top-0 z-30 flex flex-row items-center justify-between gap-3 px-4 py-3 md:px-8 border-b backdrop-blur-md"
        style={{ backgroundColor: 'rgba(249, 249, 251, 0.92)', borderColor: 'rgba(26, 32, 44, 0.1)' }}
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link to={ROUTES.home} className="flex items-center gap-2 font-semibold text-lg shrink-0" style={{ color: '#1A202C' }}>
            <span
              className="inline-flex w-8 h-8 rounded-lg items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: '#2DD4BF' }}
            >
              T
            </span>
            <span>Tezca</span>
          </Link>
          <span className="text-slate-300 shrink-0 hidden sm:inline" aria-hidden>
            ·
          </span>
          <h1 className="text-base sm:text-lg font-semibold m-0 truncate" style={{ color: '#1A202C' }}>
            Đăng nhập
          </h1>
        </div>
        <Link
          to={ROUTES.home}
          className="text-sm font-medium opacity-80 hover:opacity-100 shrink-0 whitespace-nowrap"
          style={{ color: '#0F766E' }}
        >
          Về trang chủ
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <h1 className="text-2xl md:text-3xl font-bold m-0 mb-2 text-center">Chọn cổng đăng nhập</h1>
        <p className="text-sm opacity-70 m-0 mb-10 text-center max-w-md">Bệnh nhân và chuyên gia có giao diện riêng.</p>
        <div className="grid sm:grid-cols-2 gap-4 w-full max-w-2xl">
          <Link to={ROUTES.app.login} className="rounded-2xl border p-6 no-underline hover:shadow-lg bg-white" style={{ borderColor: 'rgba(26,32,44,0.1)', color: '#1A202C' }}>
            <span className="inline-flex p-2 rounded-xl mb-3" style={{ backgroundColor: 'rgba(45,212,191,0.2)', color: '#0F766E' }}><Heart size={24} /></span>
            <h2 className="text-lg font-bold m-0 mb-1">Bệnh nhân</h2>
            <p className="text-sm opacity-70 m-0 mb-3">BMI, nhật ký, Tezca AI.</p>
            <span className="text-sm font-semibold inline-flex items-center gap-1" style={{ color: '#0F766E' }}>Đăng nhập <ArrowRight size={16} /></span>
          </Link>
          <Link to={ROUTES.expert.login} className="rounded-2xl border border-slate-700 bg-slate-900 p-6 no-underline text-slate-200 hover:border-teal-600/50">
            <span className="inline-flex p-2 rounded-xl bg-slate-800 text-teal-400 border border-slate-700 mb-3"><Stethoscope size={24} /></span>
            <h2 className="text-lg font-bold m-0 mb-1 text-white">Chuyên gia</h2>
            <p className="text-sm text-slate-400 m-0 mb-3">Doctor Desk & theo dõi BN.</p>
            <span className="text-sm font-semibold text-teal-400 inline-flex items-center gap-1">Đăng nhập <ArrowRight size={16} /></span>
          </Link>
        </div>
      </main>
    </div>
  );
}

export const DualLoginPage = LoginHubPage;

export function PatientLoginPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F9F9FB', color: '#1A202C' }}>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 md:px-8 border-b backdrop-blur-md" style={{ backgroundColor: 'rgba(249,249,251,0.92)', borderColor: 'rgba(26,32,44,0.1)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <Link to={ROUTES.home} className="flex items-center gap-2 font-semibold text-lg shrink-0">
            <span className="inline-flex w-8 h-8 rounded-lg items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: '#2DD4BF' }}>T</span>
            <span>Tezca</span>
          </Link>
          <span className="text-slate-300 hidden sm:inline">·</span>
          <h1 className="text-base sm:text-lg font-semibold m-0 truncate">Bệnh nhân</h1>
        </div>
        <div className="flex gap-3 shrink-0">
          <Link to={ROUTES.expert.login} className="text-sm font-medium" style={{ color: '#0F766E' }}>Chuyên gia →</Link>
          <Link to={ROUTES.home} className="text-sm font-medium opacity-80" style={{ color: '#0F766E' }}>Trang chủ</Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10 md:py-14">
        <div className="max-w-md w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex p-2 rounded-xl" style={{ backgroundColor: 'rgba(45,212,191,0.2)', color: '#0F766E' }}><Heart size={22} /></span>
            <h1 className="text-2xl font-bold m-0">Người dùng & bệnh nhân</h1>
          </div>
          <p className="text-sm opacity-75 m-0 mb-6">BMI, nhật ký, Tezca AI và chat với chuyên gia được gán.</p>
          <PatientLoginPanel />
        </div>
      </main>
    </div>
  );
}

function PatientLoginPanel() {
  const navigate = useNavigate();
  const { user, login, register, logout } = usePatientAuth();
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
          Đã đăng nhập bệnh nhân
        </h2>
        <p className="text-sm opacity-80 m-0 mb-4" style={{ color: '#1A202C' }}>
          <strong>{user.name}</strong>
          <span className="opacity-60"> · {user.email}</span>
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            to={ROUTES.app.root}
            className="inline-flex justify-center rounded-full py-3 px-4 font-semibold text-white text-center"
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
            Đăng xuất bệnh nhân
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
      navigate(ROUTES.app.root, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="rounded-2xl border p-6 md:p-8 shadow-xl"
      style={{ backgroundColor: 'white', borderColor: 'rgba(26, 32, 44, 0.08)' }}
    >
      <h2 className="text-lg font-semibold m-0 mb-4" style={{ color: '#1A202C' }}>
        {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
      </h2>
      <form onSubmit={submit} className="space-y-4">
        {mode === 'register' && (
          <label className="block text-sm font-medium" style={{ color: '#1A202C' }}>
            Tên hiển thị
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border px-4 py-3 text-sm"
              style={{ borderColor: 'rgba(26, 32, 44, 0.12)' }}
            />
          </label>
        )}
        <label className="block text-sm font-medium" style={{ color: '#1A202C' }}>
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border px-4 py-3 text-sm"
            style={{ borderColor: 'rgba(26, 32, 44, 0.12)' }}
          />
        </label>
        <label className="block text-sm font-medium" style={{ color: '#1A202C' }}>
          Mật khẩu
          <input
            type="password"
            required
            minLength={mode === 'register' ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border px-4 py-3 text-sm"
            style={{ borderColor: 'rgba(26, 32, 44, 0.12)' }}
          />
          {mode === 'register' && (
            <span className="block text-xs opacity-55 mt-1 font-normal">Ít nhất 8 ký tự</span>
          )}
        </label>
        {error && <p className="text-sm text-red-600 m-0">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full py-3 font-semibold text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)' }}
        >
          {busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </button>
      </form>
      <button
        type="button"
        className="mt-4 text-sm w-full text-center opacity-70 hover:opacity-100 bg-transparent border-0 cursor-pointer"
        style={{ color: '#1A202C' }}
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
      >
        {mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
      </button>
      <Link
        to={ROUTES.app.root}
        className="block text-center text-sm mt-4 opacity-60 hover:opacity-100"
        style={{ color: '#1A202C' }}
      >
        Tiếp tục dùng offline (không đồng bộ)
      </Link>
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
    </div>
  );
}

export function ExpertLoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 md:px-8 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <Link to={ROUTES.home} className="flex items-center gap-2 font-semibold text-lg text-white shrink-0">
            <span className="inline-flex w-8 h-8 rounded-lg items-center justify-center text-slate-950 text-sm font-bold bg-teal-400">T</span>
            <span>Tezca</span>
          </Link>
          <span className="text-slate-600 hidden sm:inline">·</span>
          <h1 className="text-base sm:text-lg font-semibold m-0 text-white truncate">Chuyên gia</h1>
        </div>
        <div className="flex gap-3 shrink-0">
          <Link to={ROUTES.app.login} className="text-sm text-slate-400 hover:text-teal-400">Bệnh nhân →</Link>
          <Link to={ROUTES.home} className="text-sm text-slate-400 hover:text-teal-400">Trang chủ</Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-10 md:py-14">
        <div className="max-w-md w-full">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex p-2 rounded-xl bg-slate-800 text-teal-400 border border-slate-700"><Stethoscope size={22} /></span>
            <h1 className="text-2xl font-bold m-0 text-white">Chuyên gia đồng hành</h1>
          </div>
          <p className="text-sm text-slate-400 m-0 mb-6">Dashboard bệnh nhân được gán và chat trực tiếp.</p>
          <ExpertLoginPanel />
        </div>
      </main>
    </div>
  );
}

function ExpertLoginPanel() {
  const navigate = useNavigate();
  const { user, login, logout } = useExpertAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) {
    return (
      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 md:p-8 shadow-xl">
        <h2 className="text-lg font-semibold m-0 mb-2 text-white">Đã đăng nhập chuyên gia</h2>
        <p className="text-sm text-slate-400 m-0 mb-4">
          <span className="text-slate-200 font-medium">{user.name}</span> · {user.email}
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            to={ROUTES.expert.doctorDesk}
            className="inline-flex justify-center rounded-full py-3 px-4 font-semibold bg-teal-500 text-slate-950 hover:bg-teal-400 text-center"
          >
            Mở Doctor Desk
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-full py-3 px-4 font-medium border border-slate-600 text-slate-200 text-sm hover:bg-slate-800"
          >
            Đăng xuất chuyên gia
          </button>
        </div>
        <Link to={ROUTES.app.login} className="text-xs text-slate-500 mt-4 inline-block hover:text-teal-400">
          Đăng nhập bệnh nhân (phiên riêng)
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
      navigate(ROUTES.expert.doctorDesk, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900 p-6 md:p-8 shadow-xl">
      <h2 className="text-lg font-semibold m-0 mb-1 text-white">Đăng nhập dashboard</h2>
      <p className="text-xs text-slate-500 m-0 mb-4">
        Demo API: <code className="text-teal-400">expert@tezca.vn</code> / <code className="text-teal-400">TezcaDemo#2026</code>
      </p>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium text-slate-300">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-sm text-white"
          />
        </label>
        <label className="block text-sm font-medium text-slate-300">
          Mật khẩu
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-sm text-white"
          />
        </label>
        {error && <p className="text-sm text-red-400 m-0">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full py-3 font-semibold bg-teal-500 text-slate-950 hover:bg-teal-400 disabled:opacity-50"
        >
          {busy ? 'Đang xử lý…' : 'Đăng nhập chuyên gia'}
        </button>
      </form>
      <Link to={ROUTES.home} className="block text-center text-sm mt-5 text-slate-500 hover:text-teal-400">
        Về trang chủ
      </Link>
    </div>
  );
}
