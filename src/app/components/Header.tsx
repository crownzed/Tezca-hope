import { useState } from 'react';
import { Link } from 'react-router';
import { Menu, X } from 'lucide-react';
import { ROUTES, LANDING_HASH } from '../routes';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { useExpertAuth } from '../context/ExpertAuthContext';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useMarketingPortal } from '../lib/marketingPortal';
import { tezcaTheme } from '../lib/tezcaTheme';
import { TezcaLogoLink } from './TezcaLogo';

const marketingNav = [
  { label: 'Tính năng', to: { pathname: ROUTES.home, hash: LANDING_HASH.features } },
  { label: 'Cộng đồng', to: ROUTES.community.forum },
  { label: 'Tin cậy', to: { pathname: ROUTES.home, hash: LANDING_HASH.trust } },
  { label: 'Bắt đầu', to: { pathname: ROUTES.home, hash: LANDING_HASH.consult } },
];

type HeaderProps = {
  variant?: 'marketing' | 'minimal';
};

function portalButtonLabel(
  portal: ReturnType<typeof useMarketingPortal>,
  customerName?: string,
  expertName?: string,
): string {
  if (portal.role === 'customer' && customerName?.trim()) return customerName.trim();
  if (portal.role === 'expert' && expertName?.trim()) return expertName.trim();
  return portal.label;
}

export function Header({ variant = 'minimal' }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const isMarketing = variant === 'marketing';
  const portal = useMarketingPortal();
  const { user: customerUser } = useCustomerAuth();
  const { user: expertUser } = useExpertAuth();
  const { user: adminUser } = useAdminAuth();

  const portalHref = portal.href;
  const portalLabel = portalButtonLabel(portal, customerUser?.name, expertUser?.name);
  const isAdmin = portal.role === 'admin' && !!adminUser;

  const portalButtonStyle =
    portal.role === 'admin'
      ? {
          borderColor: 'rgba(30, 41, 59, 0.25)',
          color: '#0f172a',
          backgroundColor: 'rgba(148, 163, 184, 0.15)',
        }
      : portal.role === 'expert'
        ? { background: tezcaTheme.accentGradient, color: tezcaTheme.text }
        : {
            borderColor: 'rgba(15, 118, 110, 0.35)',
            color: tezcaTheme.accentDark,
            backgroundColor: 'rgba(45, 212, 191, 0.12)',
          };

  const portalButtonClass =
    portal.role === 'expert'
      ? 'hidden sm:inline-flex px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90 max-w-[160px] truncate'
      : 'hidden sm:inline-flex px-4 py-2.5 rounded-full text-sm font-semibold border transition-colors max-w-[160px] truncate';

  return (
    <header
      className="px-6 py-4 sticky top-0 z-40 backdrop-blur-xl border-b"
      style={{ backgroundColor: 'rgba(249, 249, 251, 0.88)', borderColor: tezcaTheme.borderStrong }}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-4">
        <TezcaLogoLink to={ROUTES.home} size="lg" onClick={() => setOpen(false)} />

        {isMarketing && (
          <nav className="hidden md:flex items-center gap-10">
            {marketingNav.map((item) => (
              <Link
                key={`${item.to.pathname}${item.to.hash ?? ''}`}
                to={item.to}
                className="text-sm font-medium opacity-70 hover:opacity-100 transition-opacity"
                style={{ color: tezcaTheme.text }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {!portal.isAuthenticated && (
            <>
              <Link
                to={ROUTES.expert.login}
                className="hidden sm:inline-flex px-4 py-2.5 rounded-full text-sm font-medium border transition-colors hover:opacity-90"
                style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.text }}
              >
                Chuyên gia
              </Link>
              <Link
                to={ROUTES.auth.hub}
                className="hidden sm:inline-flex px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90"
                style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
              >
                Đăng nhập
              </Link>
            </>
          )}
          {portalHref && (
            <Link
              to={portalHref}
              className={portalButtonClass}
              style={portalButtonStyle}
              title={isAdmin ? adminUser?.email : customerUser?.email ?? expertUser?.email}
            >
              {portalLabel}
            </Link>
          )}
          <button
            type="button"
            className="md:hidden p-2 rounded-xl border transition-colors"
            style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.text }}
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
          style={{ borderColor: tezcaTheme.border }}
        >
          <div className="flex flex-col gap-1">
            {marketingNav.map((item) => (
              <Link
                key={`${item.to.pathname}${item.to.hash ?? ''}`}
                to={item.to}
                className="py-3 px-2 rounded-xl text-base font-medium"
                style={{ color: tezcaTheme.text }}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            {!portal.isAuthenticated ? (
              <>
                <Link
                  to={ROUTES.expert.login}
                  className="mt-2 py-3 text-center rounded-full text-sm font-semibold border"
                  style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.text }}
                  onClick={() => setOpen(false)}
                >
                  Chuyên gia
                </Link>
                <Link
                  to={ROUTES.auth.hub}
                  className="mt-1 py-3 text-center rounded-full text-sm font-semibold"
                  style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
                  onClick={() => setOpen(false)}
                >
                  Đăng nhập
                </Link>
              </>
            ) : portalHref ? (
              <Link
                to={portalHref}
                className="mt-1 py-3 text-center rounded-full text-sm font-semibold border"
                style={portalButtonStyle}
                onClick={() => setOpen(false)}
              >
                {portalLabel}
              </Link>
            ) : null}
          </div>
        </div>
      )}

      {open && !isMarketing && (
        <div
          className="md:hidden mt-4 pb-2 border-t pt-4 -mx-6 px-6 flex flex-col gap-2"
          style={{ borderColor: tezcaTheme.border }}
        >
          {!portal.isAuthenticated ? (
            <>
              <Link to={ROUTES.expert.login} onClick={() => setOpen(false)} className="py-2 font-medium" style={{ color: tezcaTheme.text }}>
                Chuyên gia
              </Link>
              <Link to={ROUTES.auth.hub} onClick={() => setOpen(false)} className="py-2 font-medium" style={{ color: tezcaTheme.accentDark }}>
                Đăng nhập
              </Link>
            </>
          ) : portalHref ? (
            <Link to={portalHref} onClick={() => setOpen(false)} className="py-2 font-medium" style={{ color: tezcaTheme.accentDark }}>
              {portalLabel}
            </Link>
          ) : null}
          <Link to={ROUTES.home} onClick={() => setOpen(false)} className="py-2 text-sm opacity-70" style={{ color: tezcaTheme.text }}>
            Trang chủ
          </Link>
        </div>
      )}
    </header>
  );
}
