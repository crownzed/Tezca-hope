import { Link } from 'react-router';
import { ArrowLeft, CalendarRange, LayoutGrid, MessageSquare, Shield } from 'lucide-react';
import { useExpertAuth } from '../../context/ExpertAuthContext';
import { ROUTES } from '../../routes';
import { tezcaTheme } from '../../lib/tezcaTheme';

const cardStyle = {
  backgroundColor: tezcaTheme.surface,
  borderColor: tezcaTheme.border,
};

export function ExpertSettingsPage() {
  const { user } = useExpertAuth();

  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto space-y-6" style={{ color: tezcaTheme.text }}>
      <Link
        to={ROUTES.expert.customers.root}
        className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100"
        style={{ color: tezcaTheme.text }}
      >
        <ArrowLeft size={18} />
        Danh sách khách hàng
      </Link>

      <div>
        <h1 className="text-2xl font-bold m-0">Cài đặt chuyên gia</h1>
        <p className="text-sm mt-1 m-0" style={{ color: tezcaTheme.textMuted }}>
          Tài khoản và liên kết pháp lý
        </p>
      </div>

      <div className="rounded-2xl border p-5 space-y-4" style={cardStyle}>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide m-0 mb-1" style={{ color: tezcaTheme.textMuted }}>
            Đăng nhập hiện tại
          </p>
          <p className="text-lg font-semibold m-0">{user?.name ?? '—'}</p>
          <p className="text-sm m-0 mt-0.5" style={{ color: tezcaTheme.textMuted }}>
            {user?.email ?? ''}
          </p>
        </div>
      </div>

      <nav className="rounded-2xl border divide-y overflow-hidden" style={cardStyle}>
        {[
          { to: ROUTES.expert.weeklyReport, icon: CalendarRange, label: 'Báo cáo theo tuần', sub: 'Tổng hợp hoạt động' },
          { to: ROUTES.expert.doctorDesk, icon: MessageSquare, label: 'Doctor Desk', sub: 'Chat & chỉ số' },
          { to: ROUTES.expert.customers.root, icon: LayoutGrid, label: 'Khách hàng được gán', sub: '' },
          { to: ROUTES.legal.root, icon: Shield, label: 'Trung tâm pháp lý', sub: 'Bảo mật, điều khoản, GDPR' },
          { to: ROUTES.legal.community, icon: Shield, label: 'Quy tắc cộng đồng', sub: '' },
        ].map(({ to, icon: Icon, label, sub }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-3 px-4 py-3.5 hover:opacity-90 transition-colors"
            style={{ borderColor: tezcaTheme.border, color: tezcaTheme.text }}
          >
            <Icon className="w-5 h-5 shrink-0" style={{ color: tezcaTheme.accent }} />
            <span className="font-medium">{label}</span>
            {sub ? (
              <span className="text-xs ml-auto" style={{ color: tezcaTheme.textMuted }}>
                {sub}
              </span>
            ) : null}
          </Link>
        ))}
        <Link
          to={ROUTES.legal.cookie}
          className="flex items-center gap-3 px-4 py-3.5 pl-12 hover:opacity-90"
          style={{ color: tezcaTheme.text }}
        >
          <span className="font-medium">Cookie</span>
        </Link>
        <Link
          to={ROUTES.legal.gdpr}
          className="flex items-center gap-3 px-4 py-3.5 pl-12 hover:opacity-90"
          style={{ color: tezcaTheme.text }}
        >
          <span className="font-medium">Thông báo GDPR</span>
        </Link>
      </nav>

      <p className="text-xs m-0 leading-relaxed" style={{ color: tezcaTheme.textMuted }}>
        Đổi mật khẩu hoặc hỗ trợ kỹ thuật: liên hệ quản trị hệ thống Tezca. Đăng xuất dùng nút trên thanh header chuyên gia.
      </p>
    </div>
  );
}
