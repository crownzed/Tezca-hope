import { UserCircle } from 'lucide-react';
import { useExpertAuth } from '../../context/ExpertAuthContext';
import { ExpertProfileForm } from '../../components/ExpertProfileForm';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';

export function ExpertSettingsPage() {
  const { user, token } = useExpertAuth();

  return (
    <div className="space-y-6 max-w-3xl" style={{ color: tezcaTheme.text }}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold m-0 flex items-center gap-2">
          <UserCircle size={26} style={{ color: tezcaTheme.accentDark }} aria-hidden />
          Hồ sơ chuyên gia
        </h1>
        <p className="text-sm mt-1.5 m-0 opacity-70">
          Xem và cập nhật thông tin hiển thị công khai với khách hàng.
        </p>
      </div>

      {/* Thông tin tài khoản */}
      <section className="rounded-xl border p-5" style={tezcaCardStyle}>
        <p className="text-xs font-semibold uppercase tracking-wide m-0 mb-3" style={{ color: tezcaTheme.textMuted }}>
          Tài khoản đăng nhập
        </p>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
            style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
          >
            {user?.name
              ? user.name.trim().split(/\s+/).filter(Boolean)
                  .map((p, i, arr) => i === 0 || i === arr.length - 1 ? p[0] : '')
                  .filter(Boolean).join('').slice(0, 2).toUpperCase()
              : '?'}
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold m-0 truncate">{user?.name ?? '—'}</p>
            <p className="text-sm m-0 mt-0.5 truncate" style={{ color: tezcaTheme.textMuted }}>
              {user?.email ?? ''}
            </p>
            <span
              className="inline-block mt-1.5 text-[10px] font-medium px-2 py-0.5 rounded-md"
              style={{ backgroundColor: 'rgba(45, 212, 191, 0.15)', color: tezcaTheme.accentDark }}
            >
              Chuyên gia Tezca
            </span>
          </div>
        </div>
        <p className="text-xs m-0 mt-3 leading-relaxed" style={{ color: tezcaTheme.textMuted }}>
          Đổi mật khẩu hoặc cần hỗ trợ kỹ thuật: liên hệ quản trị hệ thống Tezca.
        </p>
      </section>

      {/* Hồ sơ công khai */}
      <section className="rounded-xl border p-5 md:p-6" style={tezcaCardStyle}>
        <ExpertProfileForm token={token} />
      </section>
    </div>
  );
}
