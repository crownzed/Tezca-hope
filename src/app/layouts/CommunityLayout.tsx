import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router';
import { useEffect, useState } from 'react';
import { Bell, Bookmark, Flame, Home, LogIn, Megaphone, MessageCircle, MessagesSquare, Search, Users } from 'lucide-react';
import { ROUTES } from '../routes';
import { apiFetch } from '../lib/api';
import { useCommunityNotificationRealtime } from '../hooks/useCommunityRealtime';
import { AccountProfileButton } from '../components/AccountProfileRail';
import { CommunityLeftNav } from '../components/community/CommunityLeftNav';
import { useAnyCommunitySession } from '../lib/useCommunitySession';
import { tezcaCardStyle, tezcaTheme } from '../lib/tezcaTheme';

const sectionNav = [
  { to: ROUTES.community.forum, label: 'Diễn đàn', icon: MessagesSquare, end: true },
  { to: ROUTES.community.rooms, label: 'Phòng chat', icon: Users, end: true },
  { to: ROUTES.community.announcements, label: '#thong-bao', icon: Megaphone, end: true },
  { to: ROUTES.community.dm, label: 'Tin nhắn', icon: MessageCircle, end: true },
  { to: ROUTES.community.search, label: 'Tìm kiếm', icon: Search, end: true },
  { to: ROUTES.community.bookmarks, label: 'Đã lưu', icon: Bookmark, end: true },
] as const;

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
  const { user, role, isAuthenticated, isVerifying, logout, token } = useAnyCommunitySession();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState(0);

  // Tải số thông báo chưa đọc khi đăng nhập / đổi route
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setUnread(0);
      return;
    }
    apiFetch<{ unread: number }>('/api/community/notifications/unread-count', { token })
      .then((r) => setUnread(r.unread || 0))
      .catch(() => {});
  }, [isAuthenticated, token, location.pathname]);

  // Realtime cập nhật badge
  useCommunityNotificationRealtime(token, user?.id, isAuthenticated, setUnread);

  const profileProps = {
    role: (role === 'expert' ? 'expert' : role === 'admin' ? 'admin' : 'customer') as 'customer' | 'expert' | 'admin',
    user: isAuthenticated && user ? { name: user.name, email: user.email } : null,
    isVerifying,
    onLogout: () => {
      logout();
      navigate(ROUTES.home);
    },
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: tezcaTheme.bg, color: tezcaTheme.text }}>
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{ borderColor: tezcaTheme.border, backgroundColor: 'rgba(249, 249, 251, 0.92)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to={ROUTES.community.forum}
              className="flex items-center gap-2 font-semibold text-lg no-underline shrink-0"
              style={{ color: tezcaTheme.text }}
            >
              <span
                className="inline-flex w-8 h-8 rounded-lg items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: tezcaTheme.accentLight }}
              >
                T
              </span>
              <span className="hidden sm:inline">Tezca Cộng đồng</span>
              <span className="sm:hidden">Cộng đồng</span>
            </Link>
          </div>

          <nav
            className="flex gap-1 p-1 rounded-xl order-3 sm:order-none w-full sm:w-auto"
            style={tezcaCardStyle}
            aria-label="Khu vực cộng đồng"
          >
            {sectionNav.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className="flex-1 sm:flex-none"
                  aria-label={item.label}
                  title={item.label}
                >
                  {({ isActive }) => (
                    <span
                      className="flex items-center justify-center gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap"
                      style={
                        isActive
                          ? { background: tezcaTheme.accentGradient, color: tezcaTheme.text }
                          : { color: tezcaTheme.textMuted }
                      }
                    >
                      <Icon size={18} aria-hidden />
                      <span className="hidden sm:inline">{item.label}</span>
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated && (
              <NavLink
                to={ROUTES.community.notifications}
                className="relative inline-flex items-center justify-center w-9 h-9 rounded-full border no-underline"
                style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.text }}
                aria-label="Thông báo"
              >
                <Bell size={16} aria-hidden />
                {unread > 0 && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                    style={{ backgroundColor: '#ef4444' }}
                  >
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </NavLink>
            )}
            <Link
              to={ROUTES.home}
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium opacity-70 hover:opacity-100 no-underline"
              style={{ color: tezcaTheme.accentDark }}
            >
              <Home size={14} aria-hidden />
              Trang chủ
            </Link>
            {isAuthenticated ? (
              <Link
                to={roleAppLink(role)}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full border no-underline"
                style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.text }}
              >
                <Flame size={14} aria-hidden />
                <span className="hidden sm:inline">{roleAppLabel(role)}</span>
                <span className="sm:hidden">App</span>
              </Link>
            ) : (
              <Link
                to={ROUTES.auth.customerLogin}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full border no-underline"
                style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.text }}
              >
                <LogIn size={14} aria-hidden />
                <span>Đăng nhập</span>
              </Link>
            )}
            <AccountProfileButton {...profileProps} compact buttonClassName="px-2 py-2 rounded-xl" />
          </div>
        </div>
      </header>

      <main className="flex-1 w-full px-4 sm:px-6 py-6 md:py-8">
        <div className="max-w-7xl mx-auto flex gap-6 items-start">
          <CommunityLeftNav />
          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
