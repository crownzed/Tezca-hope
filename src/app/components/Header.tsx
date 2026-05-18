import { useState } from 'react';
import { Link } from 'react-router';
import { Menu, X } from 'lucide-react';
import { ROUTES, LANDING_HASH } from '../routes';
import { useExpertAuth } from '../context/ExpertAuthContext';

const marketingNav = [
  { label: 'Tính năng', to: { pathname: ROUTES.home, hash: LANDING_HASH.features } },
  { label: 'Tin cậy', to: { pathname: ROUTES.home, hash: LANDING_HASH.trust } },
  { label: 'Tư vấn', to: { pathname: ROUTES.home, hash: LANDING_HASH.consult } },
];

type HeaderProps = {
  variant?: 'marketing' | 'minimal';
};

export function Header({ variant = 'minimal' }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const isMarketing = variant === 'marketing';
  const { user: expertUser } = useExpertAuth();
  const showExpertPortal = expertUser?.role === 'expert';

  return (
    <header
      className="px-6 py-4 sticky top-0 z-40 backdrop-blur-xl border-b"
      style={{ backgroundColor: 'rgba(249, 249, 251, 0.88)', borderColor: 'rgba(26, 32, 44, 0.1)' }}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
        <Link to={ROUTES.home} className="flex items-center gap-2 shrink-0" onClick={() => setOpen(false)}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#2DD4BF' }}>
            <span className="text-white text-lg font-bold">T</span>
          </div>
          <span className="text-2xl font-semibold tracking-tight" style={{ color: '#1A202C' }}>
            Tezca
          </span>
        </Link>

        {isMarketing && (
          <nav className="hidden md:flex items-center gap-10">
            {marketingNav.map((item) => (
              <Link
                key={`${item.to.pathname}${item.to.hash ?? ''}`}
                to={item.to}
                className="text-sm font-medium opacity-70 hover:opacity-100 transition-opacity"
                style={{ color: '#1A202C' }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          <Link
            to={ROUTES.expert.login}
            className="hidden sm:inline-flex px-4 py-2.5 rounded-full text-sm font-medium border transition-colors hover:opacity-90"
            style={{ borderColor: 'rgba(26, 32, 44, 0.15)', color: '#1A202C' }}
          >
            Chuyên gia
          </Link>
          <Link
            to={ROUTES.auth.hub}
            className="hidden sm:inline-flex px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)', color: '#1A202C' }}
          >
            Đăng nhập
          </Link>
          <Link
            to={ROUTES.app.root}
            className="hidden sm:inline-flex px-4 py-2.5 rounded-full text-sm font-medium border transition-colors"
            style={{ borderColor: 'rgba(26, 32, 44, 0.15)', color: '#1A202C' }}
          >
            Trung tâm Kỷ luật
          </Link>
          {showExpertPortal && (
            <Link
              to={ROUTES.expert.doctorDesk}
              className="hidden sm:inline-flex px-6 py-2.5 rounded-full text-sm font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: '#1A202C', color: 'white' }}
            >
              Dashboard chuyên gia
            </Link>
          )}
          <button
            type="button"
            className="md:hidden p-2 rounded-xl border transition-colors"
            style={{ borderColor: 'rgba(26, 32, 44, 0.12)', color: '#1A202C' }}
            aria-expanded={open}
            aria-label={open ? 'Đóng menu' : 'Mở menu'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && isMarketing && (
        <div
          className="md:hidden mt-4 pb-2 border-t pt-4 -mx-6 px-6"
          style={{ borderColor: 'rgba(26, 32, 44, 0.08)' }}
        >
          <div className="flex flex-col gap-1">
            {marketingNav.map((item) => (
              <Link
                key={`${item.to.pathname}${item.to.hash ?? ''}`}
                to={item.to}
                className="py-3 px-2 rounded-xl text-base font-medium"
                style={{ color: '#1A202C' }}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to={ROUTES.expert.login}
              className="mt-2 py-3 text-center rounded-full text-sm font-semibold border"
              style={{ borderColor: 'rgba(26, 32, 44, 0.15)', color: '#1A202C' }}
              onClick={() => setOpen(false)}
            >
              Chuyên gia
            </Link>
            <Link
              to={ROUTES.auth.hub}
              className="mt-1 py-3 text-center rounded-full text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)', color: '#1A202C' }}
              onClick={() => setOpen(false)}
            >
              Đăng nhập
            </Link>
            <Link
              to={ROUTES.app.root}
              className="mt-1 py-3 text-center rounded-full text-sm font-semibold border"
              style={{ borderColor: 'rgba(26, 32, 44, 0.15)', color: '#1A202C' }}
              onClick={() => setOpen(false)}
            >
              Trung tâm Kỷ luật
            </Link>
            {showExpertPortal && (
              <Link
                to={ROUTES.expert.doctorDesk}
                className="py-3 rounded-full text-sm font-semibold text-center text-white"
                style={{ backgroundColor: '#1A202C' }}
                onClick={() => setOpen(false)}
              >
                Dashboard chuyên gia
              </Link>
            )}
          </div>
        </div>
      )}

      {open && !isMarketing && (
        <div
          className="md:hidden mt-4 pb-2 border-t pt-4 -mx-6 px-6 flex flex-col gap-2"
          style={{ borderColor: 'rgba(26, 32, 44, 0.08)' }}
        >
          <Link to={ROUTES.expert.login} onClick={() => setOpen(false)} className="py-2 font-medium" style={{ color: '#1A202C' }}>
            Chuyên gia
          </Link>
          <Link to={ROUTES.auth.hub} onClick={() => setOpen(false)} className="py-2 font-medium" style={{ color: '#0F766E' }}>
            Đăng nhập
          </Link>
          <Link to={ROUTES.app.root} onClick={() => setOpen(false)} className="py-2 font-medium" style={{ color: '#1A202C' }}>
            Ứng dụng
          </Link>
          {showExpertPortal && (
            <Link to={ROUTES.expert.doctorDesk} onClick={() => setOpen(false)} className="py-2 font-medium" style={{ color: '#1A202C' }}>
              Dashboard chuyên gia
            </Link>
          )}
          <Link to={ROUTES.home} onClick={() => setOpen(false)} className="py-2 text-sm opacity-70" style={{ color: '#1A202C' }}>
            Trang chủ
          </Link>
        </div>
      )}
    </header>
  );
}
