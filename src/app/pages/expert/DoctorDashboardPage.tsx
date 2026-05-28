import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  Activity,
  Bell,
  Bot,
  Loader2,
  MessageSquare,
  ChevronLeft,
  Send,
  Stethoscope,
  UtensilsCrossed,
  Wind,
} from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { apiFetch } from '../../lib/api';
import { useLiveChat, type LiveMessage } from '../../lib/liveChat';
import { useExpertAuth } from '../../context/ExpertAuthContext';
import { ROUTES } from '../../routes';
import { tezcaTheme } from '../../lib/tezcaTheme';
import { ExpertCustomerList, type ExpertPatientInboxRow } from '../../components/expert/ExpertCustomerList';

type PatientDetail = {
  patient: { id: string; email: string; name: string };
  bmi: { id: string; date: string; heightCm: number; weightKg: number; bmi: number }[];
  moods: { id: string; date: string; moodLabel: string; moodScore: number; note: string }[];
  botMessages: { id: string; role: string; content: string; ts: number }[];
  liveMessages: LiveMessage[];
};

type PatientRow = ExpertPatientInboxRow;

type ChatRole = 'patient' | 'doctor';

type ChatMsg = { id: string; role: ChatRole; text: string; time: string };

function formatClock(ts: number) {
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatShortDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d}/${m}`;
}

function liveToChatMsg(l: LiveMessage): ChatMsg {
  return {
    id: `l-${l.id}`,
    role: l.senderRole === 'expert' ? 'doctor' : 'patient',
    text: l.content,
    time: formatClock(l.ts),
  };
}

function bumpPatientPreview(list: PatientRow[], msg: LiveMessage): PatientRow[] {
  const next = list.map((p) =>
    p.id === msg.patientId
      ? {
          ...p,
          lastLiveMessage: {
            id: msg.id,
            content: msg.content,
            ts: msg.ts,
            senderRole: msg.senderRole,
          },
          needsReply: msg.senderRole === 'patient',
        }
      : p,
  );
  next.sort((a, b) => {
    const ta = a.lastLiveMessage?.ts ?? 0;
    const tb = b.lastLiveMessage?.ts ?? 0;
    if (tb !== ta) return tb - ta;
    return (a.name || '').localeCompare(b.name || '', 'vi');
  });
  return next;
}

function buildWeightSeries(bmi: PatientDetail['bmi']) {
  const sorted = [...bmi].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted.slice(-12);
  return last.map((e) => ({
    week: formatShortDate(e.date),
    kg: e.weightKg,
    date: e.date,
  }));
}

/** 30 ngày kết thúc hôm nay — map moodScore 1–5 → màu heat */
function buildMoodHeatmap(moods: PatientDetail['moods']): { key: string; cls: string; label: string }[] {
  const byDate = new Map<string, number>();
  for (const m of moods) {
    byDate.set(m.date, m.moodScore);
  }
  const out: { key: string; cls: string; label: string }[] = [];
  for (let i = 29; i >= 0; i--) {
    const dt = new Date();
    dt.setDate(dt.getDate() - i);
    const iso = dt.toISOString().slice(0, 10);
    const score = byDate.get(iso);
    let cls = 'bg-slate-200';
    let label = `${iso}: chưa ghi`;
    if (score != null) {
      label = `${iso}: ${score}/5`;
      if (score >= 5) cls = 'bg-emerald-500';
      else if (score === 4) cls = 'bg-teal-500';
      else if (score === 3) cls = 'bg-slate-300';
      else if (score === 2) cls = 'bg-amber-400';
      else cls = 'bg-rose-700';
    }
    out.push({ key: iso, cls, label });
  }
  return out;
}

function countUrgentPatients(patients: PatientRow[]) {
  return patients.filter((p) => (p.lastMood?.moodScore ?? 99) <= 2).length;
}

export function DoctorDashboardPage() {
  const { patientId } = useParams<{ patientId?: string }>();
  const { token, user } = useExpertAuth();
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAiContext, setShowAiContext] = useState(false);
  const [draft, setDraft] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const live = useLiveChat({
    token,
    patientId,
    historyUrl: patientId ? `/api/expert/patients/${encodeURIComponent(patientId)}/live-messages` : '',
    sendUrl: patientId ? `/api/expert/patients/${encodeURIComponent(patientId)}/live-messages` : '',
    senderRole: 'expert',
    enabled: Boolean(token && patientId),
    onIncoming: (m) => setPatientList((prev) => bumpPatientPreview(prev, m)),
  });
  const [patientList, setPatientList] = useState<PatientRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadDetail = useCallback(() => {
    if (!token || !patientId) {
      setDetail(null);
      setLoadError('');
      return;
    }
    setLoading(true);
    apiFetch<PatientDetail>(`/api/expert/patients/${patientId}`, { token })
      .then((d) => {
        setDetail(d);
        setLoadError('');
      })
      .catch((e) => {
        setDetail(null);
        setLoadError(e instanceof Error ? e.message : 'Không tải được hồ sơ');
      })
      .finally(() => setLoading(false));
  }, [token, patientId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    setDraft('');
    setShowAiContext(false);
  }, [patientId]);

  const loadPatientList = useCallback(() => {
    if (!token) return;
    setListLoading(true);
    apiFetch<{ patients: PatientRow[] }>('/api/expert/patients', { token })
      .then((r) => setPatientList(r.patients || []))
      .catch(() => setPatientList([]))
      .finally(() => setListLoading(false));
  }, [token]);

  useEffect(() => {
    loadPatientList();
  }, [loadPatientList]);

  useEffect(() => {
    if (!token) return;
    const refreshList = () => {
      if (document.visibilityState === 'hidden') return;
      apiFetch<{ patients: PatientRow[] }>('/api/expert/patients', { token })
        .then((r) => setPatientList(r.patients || []))
        .catch(() => {});
    };
    const id = window.setInterval(refreshList, 15000);
    return () => clearInterval(id);
  }, [token]);

  const emergencyCount = useMemo(() => countUrgentPatients(patientList), [patientList]);

  const messages = useMemo(() => live.messages.map(liveToChatMsg), [live.messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, patientId]);

  const weightSeries = useMemo(() => {
    if (detail?.bmi?.length) return buildWeightSeries(detail.bmi);
    return [];
  }, [detail?.bmi]);

  const heatCells = useMemo(() => {
    if (detail?.moods?.length) return buildMoodHeatmap(detail.moods);
    return [];
  }, [detail?.moods]);

  const vitals = useMemo(() => {
    if (!detail?.bmi?.length) {
      return { height: '—', weight: '—', bmi: '—', bmiSub: '' };
    }
    const sorted = [...detail.bmi].sort((a, b) => b.date.localeCompare(a.date));
    const l = sorted[0];
    let bmiSub = '';
    if (l.bmi < 18.5) bmiSub = 'Thiếu cân';
    else if (l.bmi < 25) bmiSub = 'Bình thường';
    else if (l.bmi < 30) bmiSub = 'Thừa cân';
    else bmiSub = 'Béo phì';
    return {
      height: String(l.heightCm),
      weight: String(l.weightKg),
      bmi: String(l.bmi),
      bmiSub,
    };
  }, [detail?.bmi]);

  const liveMode = Boolean(patientId && detail);
  const patientLabel = detail?.patient.name ?? (patientId ? `BN ${patientId.slice(0, 8)}…` : 'Chưa chọn khách hàng');

  const sendDoctor = async () => {
    const t = draft.trim();
    if (!t || !liveMode || !live.ready) return;
    const ok = await live.send(t);
    if (ok) setDraft('');
  };

  const quickReply = async (text: string) => {
    if (!liveMode || !live.ready) return;
    await live.send(text);
  };

  return (
    <div
      className="flex flex-col h-full min-h-0 font-[Inter,ui-sans-serif,system-ui,sans-serif] tabular-nums"
      style={{ backgroundColor: tezcaTheme.bg, color: tezcaTheme.text }}
    >
      <div
        className="lg:hidden shrink-0 flex items-center justify-between gap-3 px-3 py-2.5 border-b"
        style={{ backgroundColor: tezcaTheme.surface, borderColor: tezcaTheme.border }}
      >
        <span className="text-sm font-semibold truncate" style={{ color: tezcaTheme.text }}>
          Tezca · Doctor Desk
        </span>
        <Link to={ROUTES.expert.root} className="text-xs font-medium shrink-0" style={{ color: tezcaTheme.accent }}>
          Danh sách
        </Link>
      </div>
      <div className="flex flex-1 min-h-0 flex-col min-w-0">
          <header className="h-16 shrink-0 flex items-center gap-3 md:gap-4 px-3 md:px-6 bg-white border-b border-slate-200/90 shadow-sm">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 m-0 truncate">Live chat · Doctor Desk</p>
              <p className="text-[11px] text-slate-500 m-0 truncate hidden sm:block">
                Danh sách khách hàng · {live.transportLabel}
              </p>
            </div>
            <button
              type="button"
              className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"
              aria-label="Thông báo"
            >
              <Bell className="w-5 h-5" />
              {emergencyCount > 0 ? (
                <span className="absolute top-1.5 right-1.5 min-w-[8px] h-2 px-0.5 rounded-full bg-rose-500 ring-2 ring-white" />
              ) : null}
            </button>
            <div className="flex items-center gap-3 pl-2 border-l border-slate-200 shrink-0">
              <div className="text-right hidden sm:block min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate m-0 max-w-[140px]">{user?.name ?? 'Bác sĩ'}</p>
                <p className="text-[11px] text-emerald-600 font-medium flex items-center justify-end gap-1.5 m-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden />
                  Đang trực tuyến
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 text-white text-sm font-semibold flex items-center justify-center ring-2 ring-white shadow">
                {(user?.name ?? 'BS').slice(0, 2)}
              </div>
            </div>
          </header>

          {loadError && (
            <div className="shrink-0 mx-3 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {loadError}
            </div>
          )}

          <div className="flex-1 flex min-h-0">
            <ExpertCustomerList
              patients={patientList}
              activePatientId={patientId}
              search={search}
              onSearchChange={setSearch}
              loading={listLoading}
              className={`w-full max-w-md mx-auto lg:max-w-none lg:w-80 shrink-0 ${
                patientId ? 'hidden lg:flex' : 'flex'
              }`}
            />

            <div
              className={`flex-1 flex min-h-0 flex-col xl:flex-row min-w-0 ${
                patientId ? 'flex' : 'hidden lg:flex'
              }`}
            >
            <section className="w-full xl:w-[42%] shrink-0 flex flex-col min-h-0 bg-white border-b xl:border-b-0 xl:border-r border-slate-200">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
                <div className="min-w-0 flex items-center gap-2">
                  {patientId && (
                    <Link
                      to={ROUTES.expert.doctorDesk}
                      className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"
                      aria-label="Quay lại danh sách"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Link>
                  )}
                  <div className="min-w-0">
                  <h1 className="text-sm font-semibold text-slate-800 m-0 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-teal-600 shrink-0" />
                    Live Chat
                  </h1>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">
                    {liveMode ? (
                      <>
                        {live.transportLabel}
                        {live.ready ? (
                          <span className="text-emerald-600 font-medium"> · sẵn sàng</span>
                        ) : (
                          <span className="text-amber-600"> · đang tải…</span>
                        )}
                      </>
                    ) : (
                      'Chọn khách hàng để bắt đầu'
                    )}
                  </p>
                  </div>
                </div>
                <Link to={ROUTES.expert.root} className="text-xs font-medium text-teal-700 hover:text-teal-800 shrink-0 hidden sm:inline">
                  Gán BN
                </Link>
              </div>

              <div className="mx-3 mt-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 flex items-center gap-3 shrink-0">
                <div className="w-9 h-9 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Stethoscope className="w-4 h-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate m-0">{patientLabel}</p>
                  <p className="text-[11px] text-slate-500 m-0 truncate">
                    {detail?.patient.email ?? 'Mở từ danh sách để đồng bộ hồ sơ'}
                  </p>
                </div>
                {detail && (
                  <span className="text-[10px] font-medium uppercase tracking-wide text-teal-700 bg-teal-50 border border-teal-100 px-2 py-1 rounded-md shrink-0">
                    Live
                  </span>
                )}
              </div>

              {detail && detail.botMessages.length > 0 && (
                <div className="mx-3 mt-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAiContext((v) => !v)}
                    className="w-full text-left text-xs font-medium px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 inline-flex items-center gap-2"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    {showAiContext ? 'Ẩn' : 'Xem'} ngữ cảnh Tezca AI ({detail.botMessages.length})
                  </button>
                  {showAiContext && (
                    <div className="mt-2 max-h-32 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 space-y-2">
                      {detail.botMessages.slice(-6).map((b) => (
                        <p key={b.id} className="text-[11px] text-slate-600 m-0 leading-snug">
                          <span className="font-semibold text-slate-500">{b.role === 'assistant' ? 'AI' : 'BN'}:</span>{' '}
                          {b.content.length > 120 ? `${b.content.slice(0, 120)}…` : b.content}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-3" key={patientId ?? 'none'}>
                {live.loading && (
                  <p className="text-sm text-slate-500 text-center py-8 m-0 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang tải lịch sử chat…
                  </p>
                )}
                {messages.length === 0 && !live.loading && (
                  <p className="text-sm text-slate-500 text-center py-8 m-0">Chưa có tin nhắn trong hồ sơ này.</p>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={m.role === 'doctor' ? 'flex justify-end' : 'flex justify-start'}>
                    {m.role === 'patient' && (
                      <div className="max-w-[92%] rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-3.5 py-2.5 shadow-sm">
                        <p className="text-sm text-slate-800 m-0 leading-relaxed">{m.text}</p>
                        <p className="text-[10px] text-slate-400 mt-1.5 m-0">{m.time}</p>
                      </div>
                    )}
                    {m.role === 'doctor' && (
                      <div className="max-w-[92%] rounded-2xl rounded-tr-sm bg-blue-500 text-white px-3.5 py-2.5 shadow-sm">
                        <p className="text-sm m-0 leading-relaxed">{m.text}</p>
                        <p className="text-[10px] text-blue-100 mt-1.5 m-0">{m.time}</p>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
                {live.sendError && <p className="text-xs text-rose-600 mb-2 m-0">{live.sendError}</p>}
                <div className="flex flex-wrap gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => quickReply('Bác sĩ gửi thực đơn mẫu trong ngày — em xem và phản hồi nhé.')}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-teal-200 bg-white text-teal-800 hover:bg-teal-50 inline-flex items-center gap-1.5 disabled:opacity-40"
                    disabled={!liveMode || !live.ready || live.sending}
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    Gửi thực đơn
                  </button>
                  <button
                    type="button"
                    onClick={() => quickReply('Nhắc bài tập thở 4-7-8 (4 phút) — làm tối nay trước khi ngủ.')}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-teal-200 bg-white text-teal-800 hover:bg-teal-50 inline-flex items-center gap-1.5 disabled:opacity-40"
                    disabled={!liveMode || !live.ready || live.sending}
                  >
                    <Wind className="w-3.5 h-3.5" />
                    Bài tập thở
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendDoctor())}
                    placeholder={liveMode ? 'Nhắn cho bệnh nhân…' : 'Chọn khách hàng để nhắn…'}
                    className="flex-1 min-w-0 h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/25 bg-white disabled:bg-slate-100"
                    disabled={!liveMode || !live.ready || live.sending}
                  />
                  <button
                    type="button"
                    onClick={sendDoctor}
                    className="h-11 w-11 shrink-0 rounded-xl text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)' }}
                    aria-label="Gửi"
                    disabled={!liveMode || !live.ready || live.sending}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </section>

            <section className="flex-1 min-h-0 overflow-y-auto bg-slate-50 p-4 md:p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <VitalCard label="Chiều cao" value={vitals.height} unit="cm" />
                <VitalCard label="Cân nặng" value={vitals.weight} unit="kg" />
                <VitalCard label="BMI" value={vitals.bmi} unit="" sub={vitals.bmiSub || '—'} />
              </div>

              <div className="rounded-xl bg-white border border-slate-200/80 shadow-sm p-4 md:p-5">
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-800 m-0">Xu hướng cân nặng</h2>
                    <p className="text-xs text-slate-500 m-0 mt-0.5">
                      {detail?.bmi?.length ? 'Theo dữ liệu BMI đã lưu' : 'Chọn khách hàng để xem'}
                    </p>
                  </div>
                  <Activity className="w-5 h-5 text-teal-600 shrink-0" aria-hidden />
                </div>
                <div className="h-[240px] w-full min-h-[220px]">
                  {weightSeries.length === 0 ? (
                    <p className="text-sm text-slate-500 flex items-center justify-center h-full m-0">Chưa có dữ liệu BMI.</p>
                  ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis
                        domain={['dataMin - 1', 'dataMax + 1']}
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                        formatter={(value: number) => [`${value} kg`, 'Cân nặng']}
                        labelFormatter={(_, items) => {
                          const row = items?.[0]?.payload as { date?: string; week?: string } | undefined;
                          if (row?.date) return `Ngày ${formatShortDate(row.date)}`;
                          return row?.week ?? '';
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="kg"
                        stroke="#0d9488"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#0f766e', strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-white border border-slate-200/80 shadow-sm p-4 md:p-5">
                <h2 className="text-sm font-semibold text-slate-800 m-0 mb-1">Emotion Heatmap</h2>
                <p className="text-xs text-slate-500 m-0 mb-3">
                  30 ngày gần nhất — theo điểm cảm xúc (1–5) trong nhật ký
                </p>
                {heatCells.length === 0 ? (
                  <p className="text-sm text-slate-500 m-0">Chưa có nhật ký cảm xúc.</p>
                ) : (
                <div className="grid grid-cols-10 gap-1.5 max-w-md">
                  {heatCells.map((c) => (
                    <div
                      key={c.key}
                      title={c.label}
                      className={`aspect-square rounded-sm ${c.cls} ring-1 ring-white/40`}
                    />
                  ))}
                </div>
                )}
                <div className="flex flex-wrap gap-3 mt-4 text-[10px] text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-emerald-500" /> 4–5
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-slate-300" /> 3
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-rose-700" /> 1–2
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-slate-200" /> Chưa ghi
                  </span>
                </div>
              </div>
            </section>
            </div>
          </div>
      </div>
    </div>
  );
}

function VitalCard({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string;
  unit: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl bg-white border border-slate-200/90 shadow-sm p-4 flex flex-col justify-between min-h-[100px]">
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide m-0">{label}</p>
      <div className="flex items-baseline gap-1 mt-2">
        <span className="text-2xl font-semibold text-slate-900 tabular-nums tracking-tight">{value}</span>
        {unit ? <span className="text-sm text-slate-500 font-medium">{unit}</span> : null}
      </div>
      {sub ? <p className="text-xs text-slate-500 m-0 mt-1 tabular-nums">{sub}</p> : null}
    </div>
  );
}
