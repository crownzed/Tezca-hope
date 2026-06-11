import { Navigate } from 'react-router';
import { Activity, LogOut, UserCircle } from 'lucide-react';
import { HealthProfileForm } from '../../components/HealthProfileForm';
import { SessionLoading } from '../../components/tezca/SessionLoading';
import { useCustomerSession } from '../../lib/customerSessionGate';
import { bmiCategory, loadBmiEntries } from '../../lib/healthStorage';
import { deriveGamificationState } from '../../lib/gamification';
import { ROUTES } from '../../routes';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TK';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b last:border-b-0" style={{ borderColor: tezcaTheme.border }}>
      <span className="text-sm" style={{ color: tezcaTheme.textMuted }}>{label}</span>
      <span className="text-sm font-semibold text-right break-words" style={{ color: tezcaTheme.text }}>{value}</span>
    </div>
  );
}

export function CustomerProfilePage() {
  const { token, user, isAuthenticated, isVerifying, logout } = useCustomerSession();

  if (isVerifying && !user) {
    return <SessionLoading title="Đang tải hồ sơ…" minHeight="50vh" hint="" />;
  }

  if (!isVerifying && !isAuthenticated) {
    return <Navigate to={ROUTES.app.login} replace />;
  }

  const userId = user?.id ?? null;
  const bmiEntries = loadBmiEntries(userId);
  const latestBmi = bmiEntries[0];
  const gam = deriveGamificationState(userId);
  const displayName = user?.name || 'Khách hàng Tezca';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <section className="rounded-2xl border p-5 md:p-6" style={tezcaCardStyle}>
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0"
            style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
            aria-hidden
          >
            {initials(displayName)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wider m-0 mb-1" style={{ color: tezcaTheme.accentDark }}>
              Hồ sơ khách hàng
            </p>
            <h1 className="text-2xl md:text-3xl font-black m-0" style={{ color: tezcaTheme.heading }}>
              {displayName}
            </h1>
            <p className="text-sm m-0 mt-1 truncate" style={{ color: tezcaTheme.textMuted }}>
              {user?.email || 'Đang tải phiên tài khoản'}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold cursor-pointer"
            style={{ color: '#b91c1c', borderColor: 'rgba(239, 68, 68, 0.22)', backgroundColor: 'rgba(239, 68, 68, 0.06)' }}
          >
            <LogOut size={16} aria-hidden />
            Đăng xuất
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-6">
        <aside className="space-y-6">
          <section className="rounded-2xl border p-5" style={tezcaCardStyle}>
            <div className="flex items-center gap-2 mb-3">
              <UserCircle size={20} style={{ color: tezcaTheme.accentDark }} aria-hidden />
              <h2 className="text-base font-bold m-0" style={{ color: tezcaTheme.text }}>Tài khoản</h2>
            </div>
            <InfoRow label="Tên hiển thị" value={displayName} />
            <InfoRow label="Email" value={user?.email || '—'} />
            <InfoRow label="Vai trò" value="Khách hàng" />
          </section>

          <section className="rounded-2xl border p-5" style={tezcaCardStyle}>
            <div className="flex items-center gap-2 mb-3">
              <Activity size={20} style={{ color: tezcaTheme.accentDark }} aria-hidden />
              <h2 className="text-base font-bold m-0" style={{ color: tezcaTheme.text }}>Sức khỏe gần nhất</h2>
            </div>
            <InfoRow label="BMI" value={latestBmi ? `${latestBmi.bmi.toFixed(1)} · ${bmiCategory(latestBmi.bmi)}` : 'Chưa có'} />
            <InfoRow label="Cân nặng" value={latestBmi ? `${latestBmi.weightKg.toFixed(1)} kg` : 'Chưa có'} />
            <InfoRow label="Chuỗi kỷ luật" value={gam.stats.moodStreak > 0 ? `${gam.stats.moodStreak} ngày` : 'Chưa có'} />

          </section>


        </aside>

        <section className="rounded-2xl border p-5 md:p-6" style={tezcaCardStyle}>
          <div className="mb-5">
            <h2 className="text-lg font-bold m-0" style={{ color: tezcaTheme.text }}>Hồ sơ bệnh lý</h2>
            <p className="text-sm mt-1 m-0" style={{ color: tezcaTheme.textMuted }}>
              Bổ sung bệnh nền, dị ứng, thuốc đang dùng và chống chỉ định để giảm tư vấn sai ngữ cảnh.
            </p>
          </div>
          <HealthProfileForm token={token} compact />
        </section>
      </div>
    </div>
  );
}
