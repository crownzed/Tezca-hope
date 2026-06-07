import { Link, Outlet, useNavigate } from 'react-router';
import { Flame, Home, LogIn, Menu } from 'lucide-react';
import { useState } from 'react';
import { ROUTES } from '../routes';
import { AccountProfileButton } from '../components/AccountProfileRail';
import { CommunityLeftNav } from '../components/community/CommunityLeftNav';
import { useAnyCommunitySession } from '../lib/useCommunitySession';
import { communityShell } from '../lib/communityShellTheme';
import { tezcaTheme } from '../lib/tezcaTheme';
import { TezcaLogoLink } from '../components/TezcaLogo';

function roleAppLink(role: string) {
  if (role === 'expert') return ROUTES.expert.customers.root;
  if (role === 'admin') return ROUTES.admin.dashboard;
  return ROUTES.app.dashboard;
}

function roleAppLabel(role: string) {
  if (role === 'expert') return 'Desk chuyên gia';
  if (role === 'admin') return 'Admin Console';
  return 'Ứng dụng sức khỏe';
}

export function CommunityLayout() {
  const { user, role, isAuthenticated, isVerifying, logout } = useAnyCommunitySession();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const profileProps = {
    role: (role === 'expert' ? 'expert' : role === 'admin' ? 'admin' : 'customer') as
      | 'customer'
      | 'expert'
      | 'admin',
    user: isAuthenticated && user ? { name: user.name, email: user.email } : null,
    isVerifying,
    onLogout: () => {
      logout();
      navigate(ROUTES.home);
    },
  };

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: communityShell.pageBg, color: tezcaTheme.text }}
    >
      <CommunityLeftNav mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="lg:hidden sticky top-0 z-40 border-b px-4 py-3 flex items-center justify-between gap-3"
          style={{
            borderColor: communityShell.cardBorder,
            backgroundColor: communityShell.cardBg,
          }}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg border-0 cursor-pointer"
            style={{ backgroundColor: communityShell.inputBg }}
            aria-label="Mở menu"
          >
            <Menu size={20} />
          </button>
          <TezcaLogoLink to={ROUTES.community.forum} size="sm" />
          <AccountProfileButton {...profileProps} compact buttonClassName="px-2 py-2 rounded-xl" />
        </header>

        <div
          className="hidden lg:flex items-center justify-end gap-3 px-6 py-3 border-b shrink-0"
          style={{ borderColor: communityShell.cardBorder, backgroundColor: communityShell.cardBg }}
        >
          <Link
            to={ROUTES.home}
            className="text-xs font-medium opacity-70 hover:opacity-100 no-underline"
            style={{ color: tezcaTheme.text }}
          >
            <Home size={14} className="inline mr-1" aria-hidden />
            Trang chủ
          </Link>
          {isAuthenticated ? (
            <Link
              to={roleAppLink(role)}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full border no-underline"
              style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.text }}
            >
              <Flame size={14} aria-hidden />
              {roleAppLabel(role)}
            </Link>
          ) : (
            <Link
              to={ROUTES.auth.customerLogin}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full border no-underline"
              style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.text }}
            >
              <LogIn size={14} aria-hidden />
              Đăng nhập
            </Link>
          )}
          <AccountProfileButton {...profileProps} compact buttonClassName="px-2 py-2 rounded-xl" />
        </div>

        {mobileOpen && (
          <button
            type="button"
            className="lg:hidden fixed inset-0 z-40 bg-black/40 border-0 cursor-pointer"
            aria-label="Đóng menu"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <main className="flex-1 w-full py-4 md:py-6 px-4 sm:px-6">
          <div className="max-w-[1280px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
