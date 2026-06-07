import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight, UserPlus, UserMinus } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useExpertAuth } from '../../context/ExpertAuthContext';
import { ROUTES, expertCustomerPath, expertDoctorDeskPath } from '../../routes';
import { CustomerIntakeSummary, type CustomerIntakePacket } from '../../components/CustomerIntakeSummary';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';

type CustomerRow = {
  id: string;
  email: string;
  name: string;
  lastBmi: { date: string; bmi: number } | null;
  lastMood: { date: string; moodLabel: string; moodScore?: number } | null;
  lastLiveMessage?: { content: string; ts: number; senderRole: 'expert' | 'customer' } | null;
  needsReply?: boolean;
};
type PendingRequest = {
  id: string;
  customerId: string;
  email: string;
  name: string;
  createdAt: number;
  intake?: CustomerIntakePacket;
};

export function ExpertCustomerListPage() {
  const { token } = useExpertAuth();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [requests, setRequests] = useState<PendingRequest[]>([]);

  const load = useCallback(() => {
    if (!token) return;
    apiFetch<{ customers: CustomerRow[] }>('/api/expert/customers', { token })
      .then((r) => {
        setCustomers(r.customers);
        setError('');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi tải danh sách'));
    apiFetch<{ requests: PendingRequest[] }>('/api/expert/customers/requests', { token })
      .then((r) => setRequests(r.requests))
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const assign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !email.trim()) return;
    setBusy(true);
    setToast('');
    try {
      await apiFetch('/api/expert/customers/assign', {
        method: 'POST',
        token,
        body: JSON.stringify({ email: email.trim() }),
      });
      setEmail('');
      setToast('Đã thêm khách hàng vào danh sách của bạn.');
      load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Không gán được');
    } finally {
      setBusy(false);
    }
  };

  const unassign = async (customerId: string, name: string) => {
    if (!token) return;
    if (!window.confirm(`Gỡ "${name}" khỏi danh sách của bạn? Khách hàng vẫn dùng app; họ chỉ không còn chat/hồ sơ với bạn qua Tezca.`)) return;
    try {
      await apiFetch(`/api/expert/customers/${customerId}/assignment`, { method: 'DELETE', token });
      setToast('Đã gỡ gán.');
      load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Lỗi gỡ gán');
    }
  };

  const decideRequest = async (customerId: string, action: 'approve' | 'reject') => {
    if (!token) return;
    try {
      await apiFetch(`/api/expert/customers/${customerId}/requests/${action}`, {
        method: 'POST',
        token,
      });
      setToast(action === 'approve' ? 'Đã duyệt yêu cầu.' : 'Đã từ chối yêu cầu.');
      load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Không xử lý được yêu cầu');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl" style={{ color: tezcaTheme.text }}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold m-0">Quản lý Khách hàng</h1>
        <p className="text-sm mt-1.5 m-0 opacity-70">
          Thêm khách hàng bằng <strong>email đăng ký</strong>. Nhấn vào khách hàng để mở hồ sơ và chỉnh kế hoạch tập.
          Dữ liệu BMI / nhật ký / Tezca AI hỗ trợ đồng hành —{' '}
          <span style={{ color: tezcaTheme.accentDark }}>không thay cho khám trực tiếp hay kết luận y khoa.</span>
        </p>
      </div>

      <section className="rounded-xl border p-5" style={tezcaCardStyle}>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: tezcaTheme.accent }}>
          <UserPlus size={18} />
          Gán khách hàng mới
        </h2>
        <form onSubmit={assign} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@khachhang.com"
            disabled={busy}
            className="flex-1 rounded-xl border px-4 py-3 text-sm placeholder:opacity-50"
            style={{ borderColor: tezcaTheme.border, backgroundColor: tezcaTheme.bg, color: tezcaTheme.text }}
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl px-6 py-3 text-sm font-semibold disabled:opacity-50 shrink-0 shadow-md"
            style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
          >
            {busy ? 'Đang thêm…' : 'Thêm vào danh sách khách hàng'}
          </button>
        </form>
        {toast && (
          <p className={`text-sm mt-3 m-0 ${toast.includes('Không') || toast.includes('Lỗi') ? 'text-amber-700' : 'text-emerald-700'}`}>
            {toast}
          </p>
        )}
      </section>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {requests.length > 0 && (
        <section className="rounded-xl border p-5 space-y-3" style={tezcaCardStyle}>
          <h2 className="text-sm font-semibold">Yêu cầu chọn chuyên gia đang chờ ({requests.length})</h2>
          {requests.map((r) => (
            <div key={r.id} className="border rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium m-0">{r.name}</p>
                  <p className="text-xs opacity-70 m-0 mt-0.5">{r.email}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    className="text-xs px-3 py-2 rounded-lg bg-teal-600 text-white border-0 cursor-pointer"
                    onClick={() => void decideRequest(r.customerId, 'approve')}
                  >
                    Duyệt
                  </button>
                  <button
                    type="button"
                    className="text-xs px-3 py-2 rounded-lg border cursor-pointer"
                    onClick={() => void decideRequest(r.customerId, 'reject')}
                  >
                    Từ chối
                  </button>
                </div>
              </div>
              <CustomerIntakeSummary intake={r.intake} compact />
            </div>
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold m-0" style={{ color: tezcaTheme.text }}>
          Khách hàng đang theo dõi ({customers.length})
        </h2>
      <ul className="space-y-2 list-none m-0 p-0">
        {customers.map((p) => (
          <li
            key={p.id}
            className="rounded-xl border overflow-hidden flex flex-col sm:flex-row sm:items-stretch"
            style={{ borderColor: tezcaTheme.border, backgroundColor: tezcaTheme.surface }}
          >
            <Link
              to={expertCustomerPath(p.id)}
              className="flex-1 flex items-center justify-between gap-4 px-4 py-4 hover:opacity-90 transition-colors min-w-0"
            >
              <div className="min-w-0">
                <p className="font-medium truncate" style={{ color: tezcaTheme.text }}>
                  {p.name}
                </p>
                <p className="text-xs truncate" style={{ color: tezcaTheme.textMuted }}>
                  {p.email}
                </p>
                <p className="text-xs mt-1" style={{ color: tezcaTheme.textMuted }}>
                  {p.lastBmi ? `BMI gần nhất: ${p.lastBmi.bmi} (${p.lastBmi.date})` : 'Chưa có BMI'}
                  {p.lastMood
                    ? ` · Cảm xúc: ${p.lastMood.moodEmoji ? `${p.lastMood.moodEmoji} ` : ''}${p.lastMood.moodLabel}`
                    : ''}
                </p>
                {p.lastLiveMessage && (
                  <p className={`text-xs mt-1 truncate m-0 ${p.needsReply ? 'text-amber-700' : ''}`} style={p.needsReply ? undefined : { color: tezcaTheme.textMuted }}>
                    {p.lastLiveMessage.senderRole === 'customer' ? '💬 ' : 'Bạn: '}
                    {p.lastLiveMessage.content}
                  </p>
                )}
              </div>
              <ChevronRight className="text-slate-500 shrink-0" size={20} />
            </Link>
            <div className="flex sm:flex-col border-t sm:border-t-0 sm:border-l shrink-0" style={{ borderColor: tezcaTheme.border }}>
              <Link
                to={expertDoctorDeskPath(p.id)}
                className="flex-1 sm:w-32 flex items-center justify-center gap-2 px-3 py-3 text-xs font-medium transition-colors border-r sm:border-r-0 sm:border-b"
                style={{ color: tezcaTheme.accent, borderColor: tezcaTheme.border }}
              >
                Doctor Desk
              </Link>
              <button
                type="button"
                onClick={() => void unassign(p.id, p.name)}
                className="flex-1 sm:w-28 flex items-center justify-center gap-2 px-3 py-3 text-xs font-medium text-amber-700 hover:opacity-80 transition-colors"
              >
                <UserMinus size={16} />
                Gỡ gán
              </button>
            </div>
          </li>
        ))}
      </ul>

      {customers.length === 0 && !error && (
        <p className="text-sm m-0" style={{ color: tezcaTheme.textMuted }}>
          Chưa có khách hàng trong danh sách. Nhập email tài khoản khách hàng ở trên (người đã đăng ký tại{' '}
          <Link to={ROUTES.app.login} className="underline" style={{ color: tezcaTheme.accent }}>
            đăng nhập khách hàng
          </Link>
          ).
        </p>
      )}
      </section>
    </div>
  );
}
