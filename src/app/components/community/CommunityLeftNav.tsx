import { NavLink } from 'react-router';
import {
  Bookmark,
  Home,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  ScrollText,
  Settings,
  X,
} from 'lucide-react';
import { ROUTES } from '../../routes';
import { communityShell } from '../../lib/communityShellTheme';
import { tezcaTheme } from '../../lib/tezcaTheme';
import { TezcaLogoLink } from '../TezcaLogo';
import { useAnyCommunitySession } from '../../lib/useCommunitySession';

const navItems = [
  { to: ROUTES.community.forum, label: 'Bảng tin', icon: Home, end: true },
  { to: ROUTES.community.dm, label: 'Tin nhắn', icon: MessageCircle, end: true },
  { to: ROUTES.community.rooms, label: 'Phòng chat', icon: MessagesSquare, end: true },
  { to: ROUTES.community.announcements, label: 'Thông báo', icon: Megaphone, end: true },
] as const;

function portalLink(role: string) {
  if (role === 'expert') return { to: ROUTES.expert.customers.root, label: 'Desk chuyên gia' };
  if (role === 'admin') return { to: ROUTES.admin.dashboard, label: 'Admin Console' };
  return { to: ROUTES.app.dashboard, label: 'Ứng dụng sức khỏe' };
}

type Props = {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
};

export function CommunityLeftNav({ mobileOpen = false, onMobileClose }: Props) {
  const { role } = useAnyCommunitySession();
  const portal = portalLink(role);
  const asideClass =
    'flex flex-col shrink-0 border-r h-screen sticky top-0 z-50 overflow-y-auto ' +
    'w-[var(--community-sidebar-w)] ' +
    (mobileOpen ? 'fixed left-0 shadow-xl' : 'hidden lg:flex');

  return (
    <aside
      className={asideClass}
      style={
        {
          '--community-sidebar-w': communityShell.sidebarWidth,
          backgroundColor: communityShell.sidebarBg,
          borderColor: communityShell.cardBorder,
        } as React.CSSProperties
      }
      aria-label="Điều hướng cộng đồng"
    >
      <div className="p-5 flex items-center justify-between gap-2">
        <TezcaLogoLink to={ROUTES.community.forum} size="md" onClick={onMobileClose} />
        {mobileOpen && onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="lg:hidden p-2 rounded-lg border-0 cursor-pointer"
            style={{ backgroundColor: communityShell.inputBg }}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="px-3 flex-1">
        <ul className="list-none m-0 p-0 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className="block no-underline" onClick={onMobileClose}>
                  {({ isActive }) => (
                    <span
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                      style={
                        isActive
                          ? {
                              backgroundColor: communityShell.navActiveBg,
                              color: communityShell.navActiveText,
                              boxShadow: communityShell.cardShadow,
                            }
                          : { color: communityShell.navText }
                      }
                    >
                      <Icon size={18} strokeWidth={isActive ? 2.25 : 2} aria-hidden />
                      {item.label}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>

        <p
          className="text-[10px] uppercase tracking-wider font-semibold mt-6 mb-2 px-3 m-0"
          style={{ color: communityShell.navText }}
        >
          Khác
        </p>
        <ul className="list-none m-0 p-0 space-y-1">
          {[
            { to: ROUTES.legal.community, label: 'Quy tắc', icon: ScrollText, end: true },
            { to: portal.to, label: portal.label, icon: Settings, end: false },
            { to: ROUTES.home, label: 'Trang chủ', icon: Bookmark, end: false },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className="block no-underline" onClick={onMobileClose}>
                  {({ isActive }) => (
                    <span
                      className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium"
                      style={{ color: isActive ? tezcaTheme.accentDark : communityShell.navText }}
                    >
                      <Icon size={16} aria-hidden />
                      {item.label}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>

      </nav>

      <p className="px-5 py-4 text-[11px] m-0 opacity-50" style={{ color: communityShell.navText }}>
        Cộng đồng sức khỏe Tezca
      </p>
    </aside>
  );
}
