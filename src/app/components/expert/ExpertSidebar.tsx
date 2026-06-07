import { NavLink } from 'react-router';
import { CalendarRange, LayoutGrid, MessageSquare, UserCircle, Users } from 'lucide-react';
import { ROUTES } from '../../routes';
import { tezcaTheme } from '../../lib/tezcaTheme';
import { TezcaLogoLink } from '../TezcaLogo';

const navItems = [
  {
    to: ROUTES.expert.customers.root,
    label: 'Khách hàng',
    icon: LayoutGrid,
    isActive: (pathname: string) =>
      pathname === ROUTES.expert.customers.root || pathname.startsWith(`${ROUTES.expert.customers.root}/`),
  },
  {
    to: ROUTES.expert.doctorDesk,
    label: 'Doctor Desk',
    icon: MessageSquare,
    isActive: (pathname: string) => pathname.startsWith(ROUTES.expert.workspace.root),
  },
  {
    to: ROUTES.expert.weeklyReport,
    label: 'Báo cáo tuần',
    icon: CalendarRange,
    isActive: (pathname: string) => pathname.startsWith(ROUTES.expert.reports.root),
  },
  {
    to: ROUTES.community.forum,
    label: 'Cộng đồng',
    icon: Users,
    isActive: (pathname: string) => pathname.startsWith(ROUTES.community.root),
  },
  {
    to: ROUTES.expert.settings,
    label: 'Hồ sơ chuyên gia',
    icon: UserCircle,
    isActive: (pathname: string) => pathname === ROUTES.expert.settings,
  },
] as const;

export function ExpertSidebar() {
  return (
    <aside
      className="w-full md:w-64 shrink-0 md:min-h-screen p-5 flex flex-col"
      style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}
    >
      <div className="mb-6 flex flex-col items-center gap-2">
        <TezcaLogoLink to={ROUTES.home} size="sm" wordmarkColor="#f8fafc" />
        <p className="text-xs text-slate-400 m-0 text-center">Bàn chuyên gia</p>
      </div>
      <nav aria-label="Bàn làm việc chuyên gia">
        <ul className="space-y-1 list-none m-0 p-0">
          {navItems.map(({ to, label, icon: Icon, isActive }) => (
            <li key={to}>
              <NavLink
                to={to}
                isActive={(_, location) => isActive(location.pathname)}
                className={({ isActive: active }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors ${
                    active ? 'bg-teal-600/20 text-teal-300' : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <Icon size={18} aria-hidden style={{ color: tezcaTheme.accentLight }} />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
