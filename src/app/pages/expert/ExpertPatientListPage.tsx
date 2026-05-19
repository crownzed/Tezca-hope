import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CalendarRange, ChevronRight, UserPlus, UserMinus } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useExpertAuth } from '../../context/ExpertAuthContext';
import { ROUTES, expertPatientPath } from '../../routes';

type PatientRow = {
  id: string;
  email: string;
  name: string;
  lastBmi: { date: string; bmi: number } | null;
  lastMood: { date: string; moodLabel: string; moodScore?: number } | null;
  lastLiveMessage?: { content: string; ts: number; senderRole: 'expert' | 'patient' } | null;
  needsReply?: boolean;
};

export function ExpertPatientListPage() {
  const { token } = useExpertAuth();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(() => {
    if (!token) return;
    apiFetch<{ patients: PatientRow[] }>('/api/expert/patients', { token })
      .then((r) => {
        setPatients(r.patients);
        setError('');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Lỗi tải danh sách'));
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
      await apiFetch('/api/expert/patients/assign', {
        method: 'POST',
        token,
        body: JSON.stringify({ email: email.trim() }),
      });
      setEmail('');
      setToast('Đã thêm bệnh nhân vào danh sách của bạn.');
      load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Không gán được');
    } finally {
      setBusy(false);
    }
  };

  const unassign = async (patientId: string, name: string) => {
    if (!token) return;
    if (!window.confirm(`Gỡ "${name}" khỏi danh sách của bạn? Bệnh nhân vẫn dùng app; họ chỉ không còn chat/hồ sơ với bạn qua Tezca.`)) return;
    try {
      await apiFetch(`/api/expert/patients/${patientId}/assignment`, { method: 'DELETE', token });
      setToast('Đã gỡ gán.');
      load();
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Lỗi gỡ gán');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Bệnh nhân được gán</h1>
        <p className="text-sm text-slate-400">
          Thêm bệnh nhân bằng <strong className="text-slate-300">email đăng ký</strong> (tài khoản vai trò bệnh nhân). Sau khi gán, họ
          thấy bạn trong app và có thể chat trực tiếp; dữ liệu BMI / nhật ký / Tezca AI dùng để đồng hành —{' '}
          <span className="text-teal-400/90">không thay cho khám trực tiếp hay kết luận y khoa.</span>
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link
            to={ROUTES.expert.weeklyReport}
            className="inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2.5 bg-slate-800 text-teal-300 border border-teal-500/30 hover:bg-slate-800/90 transition-colors"
          >
            <CalendarRange size={16} />
            Báo cáo tuần
          </Link>
          <Link
            to={ROUTES.expert.doctorDesk}
            className="inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2.5 bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 transition-colors"
          >
            Mở Doctor Desk
          </Link>
          <Link
            to={ROUTES.expert.settings}
            className="inline-flex items-center gap-2 text-sm font-medium rounded-xl px-4 py-2.5 text-slate-300 border border-slate-600 hover:bg-slate-800/80 transition-colors"
          >
            Cài đặt
          </Link>
        </div>
      </div>

      <section
        className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5"
        style={{ boxShadow: '0 8px 32px -12px rgba(0,0,0,0.4)' }}
      >
        <h2 className="text-sm font-semibold text-teal-400 mb-3 flex items-center gap-2">
          <UserPlus size={18} />
          Gán bệnh nhân mới
        </h2>
        <form onSubmit={assign} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@benhnhan.com"
            disabled={busy}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl px-6 py-3 text-sm font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 shrink-0"
          >
            {busy ? 'Đang thêm…' : 'Thêm vào danh sách'}
          </button>
        </form>
        {toast && (
          <p className={`text-sm mt-3 m-0 ${toast.includes('Không') || toast.includes('Lỗi') ? 'text-amber-400' : 'text-teal-300'}`}>
            {toast}
          </p>
        )}
      </section>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <ul className="space-y-2">
        {patients.map((p) => (
          <li
            key={p.id}
            className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden flex flex-col sm:flex-row sm:items-stretch"
          >
            <Link
              to={expertPatientPath(p.id)}
              className="flex-1 flex items-center justify-between gap-4 px-4 py-4 hover:bg-slate-800/50 transition-colors min-w-0"
            >
              <div className="min-w-0">
                <p className="font-medium text-white truncate">{p.name}</p>
                <p className="text-xs text-slate-500 truncate">{p.email}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {p.lastBmi ? `BMI gần nhất: ${p.lastBmi.bmi} (${p.lastBmi.date})` : 'Chưa có BMI'}
                  {p.lastMood ? ` · Cảm xúc: ${p.lastMood.moodLabel}` : ''}
                </p>
                {p.lastLiveMessage && (
                  <p className={`text-xs mt-1 truncate m-0 ${p.needsReply ? 'text-amber-300' : 'text-slate-500'}`}>
                    {p.lastLiveMessage.senderRole === 'patient' ? '💬 ' : 'Bạn: '}
                    {p.lastLiveMessage.content}
                  </p>
                )}
              </div>
              <ChevronRight className="text-slate-500 shrink-0" size={20} />
            </Link>
            <div className="flex sm:flex-col border-t sm:border-t-0 sm:border-l border-slate-800 shrink-0">
              <Link
                to={`${ROUTES.expert.doctorDesk}/${p.id}`}
                className="flex-1 sm:w-32 flex items-center justify-center gap-2 px-3 py-3 text-xs font-medium text-teal-300 hover:bg-slate-800/80 transition-colors border-r sm:border-r-0 sm:border-b border-slate-800"
              >
                Doctor Desk
              </Link>
              <button
                type="button"
                onClick={() => void unassign(p.id, p.name)}
                className="flex-1 sm:w-28 flex items-center justify-center gap-2 px-3 py-3 text-xs font-medium text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 transition-colors"
              >
                <UserMinus size={16} />
                Gỡ gán
              </button>
            </div>
          </li>
        ))}
      </ul>

      {patients.length === 0 && !error && (
        <p className="text-slate-500 text-sm">
          Chưa có bệnh nhân. Nhập email tài khoản bệnh nhân ở trên (người đã đăng ký tại{' '}
          <Link to={ROUTES.app.login} className="text-teal-400 underline">
            đăng nhập bệnh nhân
          </Link>
          ).
        </p>
      )}
    </div>
  );
}
