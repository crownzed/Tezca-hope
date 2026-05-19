import { Link } from 'react-router';
import { ArrowLeft, CalendarRange, LayoutGrid, MessageSquare, Shield } from 'lucide-react';
import { useExpertAuth } from '../../context/ExpertAuthContext';
import { ROUTES } from '../../routes';

export function ExpertSettingsPage() {
  const { user } = useExpertAuth();

  return (
    <div className="p-4 md:p-8 max-w-xl mx-auto space-y-6">
      <Link
        to={ROUTES.expert.root}
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-teal-400"
      >
        <ArrowLeft size={18} />
        Danh sách bệnh nhân
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white m-0">Cài đặt chuyên gia</h1>
        <p className="text-sm text-slate-500 mt-1 m-0">Tài khoản và liên kết pháp lý</p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-4">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide m-0 mb-1">Đăng nhập hiện tại</p>
          <p className="text-lg font-semibold text-white m-0">{user?.name ?? '—'}</p>
          <p className="text-sm text-slate-400 m-0 mt-0.5">{user?.email ?? ''}</p>
        </div>
      </div>

      <nav className="rounded-2xl border border-slate-800 bg-slate-900/60 divide-y divide-slate-800 overflow-hidden">
        <Link
          to={ROUTES.expert.weeklyReport}
          className="flex items-center gap-3 px-4 py-3.5 text-slate-200 hover:bg-slate-800/80 transition-colors"
        >
          <CalendarRange className="w-5 h-5 text-teal-400 shrink-0" />
          <span className="font-medium">Báo cáo theo tuần</span>
          <span className="text-xs text-slate-500 ml-auto">Tổng hợp hoạt động</span>
        </Link>
        <Link
          to={ROUTES.expert.doctorDesk}
          className="flex items-center gap-3 px-4 py-3.5 text-slate-200 hover:bg-slate-800/80 transition-colors"
        >
          <MessageSquare className="w-5 h-5 text-teal-400 shrink-0" />
          <span className="font-medium">Doctor Desk</span>
          <span className="text-xs text-slate-500 ml-auto">Live chat & chỉ số</span>
        </Link>
        <Link
          to={ROUTES.expert.root}
          className="flex items-center gap-3 px-4 py-3.5 text-slate-200 hover:bg-slate-800/80 transition-colors"
        >
          <LayoutGrid className="w-5 h-5 text-teal-400 shrink-0" />
          <span className="font-medium">Bệnh nhân được gán</span>
        </Link>
        <Link
          to={ROUTES.legal.terms}
          className="flex items-center gap-3 px-4 py-3.5 text-slate-200 hover:bg-slate-800/80 transition-colors"
        >
          <Shield className="w-5 h-5 text-slate-400 shrink-0" />
          <span className="font-medium">Điều khoản sử dụng</span>
        </Link>
        <Link
          to={ROUTES.legal.privacy}
          className="flex items-center gap-3 px-4 py-3.5 text-slate-200 hover:bg-slate-800/80 transition-colors"
        >
          <Shield className="w-5 h-5 text-slate-400 shrink-0" />
          <span className="font-medium">Chính sách bảo mật</span>
        </Link>
        <Link
          to={ROUTES.legal.cookie}
          className="flex items-center gap-3 px-4 py-3.5 text-slate-200 hover:bg-slate-800/80 transition-colors"
        >
          <span className="font-medium pl-8">Cookie</span>
        </Link>
        <Link
          to={ROUTES.legal.gdpr}
          className="flex items-center gap-3 px-4 py-3.5 text-slate-200 hover:bg-slate-800/80 transition-colors"
        >
          <span className="font-medium pl-8">Thông báo GDPR</span>
        </Link>
      </nav>

      <p className="text-xs text-slate-500 m-0 leading-relaxed">
        Đổi mật khẩu hoặc hỗ trợ kỹ thuật: liên hệ quản trị hệ thống Tezca. Đăng xuất dùng nút trên thanh header chuyên gia.
      </p>
    </div>
  );
}
