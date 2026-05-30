import { NavLink } from 'react-router';
import { Bookmark, Home, Megaphone, MessageCircle, MessagesSquare, ScrollText, Users } from 'lucide-react';
import { ROUTES } from '../../routes';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';

const navItems = [
  { to: ROUTES.community.forum, label: 'Diễn đàn', icon: Home, end: true },
  { to: ROUTES.community.rooms, label: 'Phòng chat', icon: MessagesSquare, end: true },
  { to: ROUTES.community.announcements, label: '#thong-bao', icon: Megaphone, end: true },
  { to: ROUTES.community.dm, label: 'Tin nhắn riêng', icon: MessageCircle, end: true },
  { to: ROUTES.legal.community, label: 'Quy tắc cộng đồng', icon: ScrollText, end: true },
] as const;

export function CommunityLeftNav() {
  return (
    <aside
      className="hidden lg:flex flex-col w-56 shrink-0 sticky top-28 self-start rounded-2xl border p-4"
      style={tezcaCardStyle}
      aria-label="Điều hướng cộng đồng"
    >
      <p className="text-xs uppercase tracking-wide font-semibold m-0 mb-3" style={{ color: tezcaTheme.textMuted }}>
        Tezca Cộng đồng
      </p>
      <nav>
        <ul className="list-none m-0 p-0 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className="block no-underline">
                  {({ isActive }) => (
                    <span
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                      style={
                        isActive
                          ? { background: tezcaTheme.accentGradient, color: tezcaTheme.text }
                          : { color: tezcaTheme.textMuted }
                      }
                    >
                      <Icon size={18} aria-hidden />
                      {item.label}
                    </span>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-6 pt-4 border-t space-y-1" style={{ borderColor: tezcaTheme.border }}>
        <NavLink to={ROUTES.home} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm no-underline opacity-70 hover:opacity-100" style={{ color: tezcaTheme.text }}>
          <Home size={16} aria-hidden />
          Trang chủ
        </NavLink>
        <NavLink to={ROUTES.app.dashboard} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm no-underline opacity-70 hover:opacity-100" style={{ color: tezcaTheme.text }}>
          <Users size={16} aria-hidden />
          Ứng dụng sức khỏe
        </NavLink>
        <a
          href={`${ROUTES.home}#cong-dong`}
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm no-underline opacity-70 hover:opacity-100"
          style={{ color: tezcaTheme.text }}
        >
          <Bookmark size={16} aria-hidden />
          Giới thiệu
        </a>
      </div>
    </aside>
  );
}
