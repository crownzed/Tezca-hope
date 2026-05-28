import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../lib/api';
import type { DashboardExercise } from '../../lib/dashboardStorage';
import type { PatientTrainingPlan, TrainingPlanResponse } from '../../lib/trainingPlan';
import {
  applyDayProgress,
  buildWeekDaysWithIso,
  countDayDone,
  normalizeDailyProgressFromApi,
} from '../../lib/trainingDayProgress';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';

const inputStyle = {
  borderColor: tezcaTheme.borderStrong,
  backgroundColor: tezcaTheme.surface,
  color: tezcaTheme.text,
} as const;

type Props = {
  token: string;
  patientId: string;
};

export function ExpertTrainingPlanPanel({ token, patientId }: Props) {
  const [plan, setPlan] = useState<PatientTrainingPlan | null>(null);
  const [structure, setStructure] = useState<DashboardExercise[]>([]);
  const [dailyProgress, setDailyProgress] = useState<PatientTrainingPlan['dailyProgress']>({});
  const [viewIso, setViewIso] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  const [expertNote, setExpertNote] = useState('');
  const [showSource, setShowSource] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const weekDays = useMemo(() => buildWeekDaysWithIso(), []);

  const normalizedDaily = useMemo(
    () => normalizeDailyProgressFromApi(dailyProgress),
    [dailyProgress],
  );

  const viewExercises = useMemo(
    () => applyDayProgress(structure, normalizedDaily[viewIso]),
    [structure, normalizedDaily, viewIso],
  );

  const load = useCallback(() => {
    if (!token || !patientId) return;
    setLoading(true);
    apiFetch<TrainingPlanResponse>(
      `/api/expert/patients/${encodeURIComponent(patientId)}/training-plan`,
      { token },
    )
      .then((r) => {
        setPlan(r.plan);
        setStructure(r.plan?.exercises ?? []);
        setDailyProgress(r.plan?.dailyProgress ?? {});
        setExpertNote(r.plan?.expertNote ?? '');
        setToast('');
      })
      .catch((e) => setToast(e instanceof Error ? e.message : 'Không tải được kế hoạch tập'))
      .finally(() => setLoading(false));
  }, [token, patientId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (status: 'pending_review' | 'approved') => {
    if (!plan) return;
    setBusy(true);
    setToast('');
    try {
      const r = await apiFetch<TrainingPlanResponse>(
        `/api/expert/patients/${encodeURIComponent(patientId)}/training-plan`,
        {
          method: 'PUT',
          token,
          body: JSON.stringify({ exercises: structure, status, expertNote: expertNote.trim() }),
        },
      );
      setPlan(r.plan);
      setStructure(r.plan?.exercises ?? []);
      setDailyProgress(r.plan?.dailyProgress ?? {});
      setToast(status === 'approved' ? 'Đã duyệt — bệnh nhân thấy trên Chiến dịch tập luyện.' : 'Đã lưu chỉnh sửa.');
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Không lưu được');
    } finally {
      setBusy(false);
    }
  };

  const updateExercise = (id: number, patch: Partial<DashboardExercise>) => {
    setStructure((list) => list.map((ex) => (ex.id === id ? { ...ex, ...patch } : ex)));
  };

  const addRow = () => {
    setStructure((list) => [
      ...list,
      {
        id: Date.now(),
        title: 'Bài tập mới',
        sets: 3,
        reps: 10,
        isPTLocked: true,
        completed: false,
        actualWeight: '',
      },
    ]);
  };

  const removeRow = (id: number) => {
    setStructure((list) => list.filter((ex) => ex.id !== id));
  };

  if (loading) {
    return (
      <section className="xl:col-span-12 rounded-2xl border p-4" style={tezcaCardStyle}>
        <p className="text-xs m-0" style={{ color: tezcaTheme.textMuted }}>
          Đang tải kế hoạch tập luyện…
        </p>
      </section>
    );
  }

  if (!plan) {
    return (
      <section className="xl:col-span-12 rounded-2xl border p-4" style={tezcaCardStyle}>
        <h2 className="text-sm font-semibold m-0" style={{ color: tezcaTheme.accentDark }}>
          Kế hoạch tập luyện (Trung tâm kỷ luật)
        </h2>
        <p className="text-xs mt-2 m-0" style={{ color: tezcaTheme.textMuted }}>
          Chưa có kế hoạch trên server. Bệnh nhân có thể đánh dấu bài trên dashboard (tự tạo kế hoạch) hoặc tích hợp
          từ trang <strong>Kế hoạch</strong> AI.
        </p>
      </section>
    );
  }

  const statusLabel =
    plan.status === 'approved' ? (
      <span className="text-emerald-700">Đã duyệt</span>
    ) : (
      <span className="text-amber-700">Chờ duyệt</span>
    );
  const when = new Date(plan.integratedAt).toLocaleString('vi-VN');
  const { done: viewDone, total: viewTotal } = countDayDone(structure, normalizedDaily[viewIso]);

  return (
    <section className="xl:col-span-12 rounded-2xl border p-4 space-y-4" style={tezcaCardStyle}>
      <div>
        <h2 className="text-sm font-semibold m-0" style={{ color: tezcaTheme.accentDark }}>
          Kế hoạch tập luyện (Trung tâm kỷ luật)
        </h2>
        <p className="text-xs mt-1 m-0" style={{ color: tezcaTheme.textMuted }}>
          Tích hợp từ kế hoạch AI · {when} · {statusLabel}
          {viewTotal > 0 && (
            <span className="opacity-80">
              {' '}
              · Tiến độ ngày xem: {viewDone}/{viewTotal} bài
            </span>
          )}
        </p>
      </div>

      {toast && <p className="text-xs text-amber-800 m-0">{toast}</p>}

      <div className="flex flex-wrap gap-1.5">
        {weekDays.map((day) => {
          const { done, total } = countDayDone(structure, normalizedDaily[day.isoDate]);
          const allDone = total > 0 && done === total;
          return (
            <button
              key={day.isoDate}
              type="button"
              onClick={() => setViewIso(day.isoDate)}
              className={`text-[10px] px-2 py-1 rounded-lg border ${
                viewIso === day.isoDate ? '' : 'hover:opacity-90'
              }`}
              style={
                viewIso === day.isoDate
                  ? { borderColor: tezcaTheme.accent, color: tezcaTheme.accentDark, backgroundColor: 'rgba(45,212,191,0.12)' }
                  : { borderColor: tezcaTheme.borderStrong, color: tezcaTheme.textMuted }
              }
            >
              {day.label}
              {allDone ? ' ✓' : done > 0 ? ` ${done}/${total}` : ''}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowSource((v) => !v)}
          className="text-xs border rounded-lg px-3 py-1.5 hover:opacity-90"
          style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.textMuted }}
        >
          {showSource ? 'Ẩn bản gốc AI' : 'Xem bản gốc AI'}
        </button>
        <button
          type="button"
          onClick={addRow}
          className="text-xs border rounded-lg px-3 py-1.5 hover:opacity-90"
          style={{ borderColor: 'rgba(45,212,191,0.35)', color: tezcaTheme.accentDark }}
        >
          + Thêm bài
        </button>
      </div>

      {showSource && plan.sourcePlanMd && (
        <pre
          className="text-xs whitespace-pre-wrap font-sans max-h-48 overflow-y-auto rounded-xl p-3 border m-0"
          style={{ color: tezcaTheme.textMuted, backgroundColor: tezcaTheme.subtleBg, borderColor: tezcaTheme.border }}
        >
          {plan.sourcePlanMd}
        </pre>
      )}

      <p className="text-[10px] m-0" style={{ color: tezcaTheme.textMuted }}>
        Tiến độ hoàn thành / tạ thực tế do bệnh nhân nhập — chỉ xem theo ngày, không sửa tại đây.
      </p>

      <div className="space-y-2">
        {structure.map((ex) => {
          const view = viewExercises.find((v) => v.id === ex.id);
          return (
            <div
              key={ex.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center rounded-xl p-3 border"
              style={{ backgroundColor: tezcaTheme.subtleBg, borderColor: tezcaTheme.border }}
            >
              <div className="md:col-span-4 flex items-center gap-2 min-w-0">
                {view?.completed && (
                  <span className="shrink-0 text-[10px] font-bold uppercase text-emerald-700 border border-emerald-300 rounded px-1.5 py-0.5 bg-emerald-50">
                    Xong
                  </span>
                )}
                <input
                  value={ex.title}
                  onChange={(e) => updateExercise(ex.id, { title: e.target.value })}
                  className="flex-1 min-w-0 rounded-lg border px-2 py-1.5 text-sm"
                  style={inputStyle}
                  aria-label="Tên bài"
                />
              </div>
              <input
                type="number"
                min={1}
                max={20}
                value={ex.sets}
                onChange={(e) => updateExercise(ex.id, { sets: Number(e.target.value) || 1 })}
                className="md:col-span-1 rounded-lg border px-2 py-1.5 text-sm"
                style={inputStyle}
                aria-label="Hiệp"
              />
              <input
                value={String(ex.reps)}
                onChange={(e) => updateExercise(ex.id, { reps: e.target.value })}
                className="md:col-span-2 rounded-lg border px-2 py-1.5 text-sm"
                style={inputStyle}
                aria-label="Lặp hoặc thời lượng"
              />
              <span className="md:col-span-2 text-xs truncate opacity-70" title="Tạ BN ghi nhận">
                {view?.actualWeight ? `BN: ${view.actualWeight}` : '—'}
              </span>
              <label className="md:col-span-2 flex items-center gap-2 text-xs opacity-70">
                <input
                  type="checkbox"
                  checked={ex.isPTLocked}
                  onChange={(e) => updateExercise(ex.id, { isPTLocked: e.target.checked })}
                />
                PT khóa
              </label>
              <button
                type="button"
                onClick={() => removeRow(ex.id)}
                className="md:col-span-1 text-xs text-rose-600 hover:text-rose-700 justify-self-end"
              >
                Xóa
              </button>
            </div>
          );
        })}
        {structure.length === 0 && (
          <p className="text-xs m-0" style={{ color: tezcaTheme.textMuted }}>
            Chưa có bài tập — thêm ít nhất một dòng.
          </p>
        )}
      </div>

      <label className="block text-xs opacity-80">
        Ghi chú cho bệnh nhân
        <textarea
          value={expertNote}
          onChange={(e) => setExpertNote(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
          style={inputStyle}
          placeholder="Ví dụ: Giảm tạ squat 10% tuần này…"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save('pending_review')}
          className="rounded-xl border px-4 py-2 text-sm disabled:opacity-50 hover:opacity-90"
          style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.text }}
        >
          Lưu chỉnh sửa
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save('approved')}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90"
          style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
        >
          Duyệt & gửi cho bệnh nhân
        </button>
      </div>
    </section>
  );
}
