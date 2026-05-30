import { NavLink } from 'react-router';
import { BarChart3, GraduationCap, Users } from 'lucide-react';
import { ROUTES } from '../../routes';
import { tezcaTheme } from '../../lib/tezcaTheme';

const navItems = [
  { to: ROUTES.admin.dashboard, label: 'Tổng quan hệ thống', icon: BarChart3, end: true },
  { to: ROUTES.admin.customers, label: 'Quản lý Khách hàng', icon: Users },
  { to: ROUTES.admin.experts, label: 'Quản lý Chuyên gia', icon: GraduationCap },
] as const;

export function AdminSidebar() {
  return (
    <aside
      className="w-full md:w-64 shrink-0 md:min-h-screen p-5 flex flex-col"
      style={{ backgroundColor: '#1e293b', color: '#f8fafc' }}
    >
      <h2 className="text-xl font-bold mb-6 text-center m-0">Admin Panel</h2>
      <nav aria-label="Quản trị hệ thống">
        <ul className="space-y-1 list-none m-0 p-0">
          {navItems.map(({ to, label, icon: Icon, ...rest }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={'end' in rest ? rest.end : false}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium no-underline transition-colors ${
                    isActive ? 'bg-teal-600/20 text-teal-300' : 'text-slate-300 hover:text-white hover:bg-white/5'
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
