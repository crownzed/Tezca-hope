import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useParams } from 'react-router';
import {
  Activity,
  Bell,
  Bot,
  LayoutDashboard,
  Loader2,
  MessageSquare,
  Search,
  Send,
  Settings,
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
import { apiFetch, wsUrl } from '../../lib/api';
import { useExpertAuth } from '../../context/ExpertAuthContext';
import { ROUTES } from '../../routes';

type LiveMessage = {
  id: string;
  patientId: string;
  senderUserId: string;
  senderRole: 'expert' | 'patient';
  content: string;
  ts: number;
};

type PatientDetail = {
  patient: { id: string; email: string; name: string };
  bmi: { id: string; date: string; heightCm: number; weightKg: number; bmi: number }[];
  moods: { id: string; date: string; moodLabel: string; moodScore: number; note: string }[];
  botMessages: { id: string; role: string; content: string; ts: number }[];
  liveMessages: LiveMessage[];
};

type PatientRow = {
  id: string;
  email: string;
  name: string;
  lastBmi: { date: string; bmi: number } | null;
  lastMood: { date: string; moodLabel: string; moodScore?: number } | null;
};

type ChatRole = 'patient' | 'bot' | 'doctor';

type ChatMsg = { id: string; role: ChatRole; text: string; time: string };

const DEMO_CHAT: ChatMsg[] = [
  {
    id: 'd1',
    role: 'bot',
    text: 'Tóm tắt phiên khai thác triệu chứng (demo): bệnh nhân mô tả mệt chiều, khó ngủ 3–4 đêm/tuần.',
    time: '08:41',
  },
  { id: 'd2', role: 'patient', text: 'Chào bác sĩ, em vẫn hay thức khuya vì công việc.', time: '08:43' },
  { id: 'd3', role: 'doctor', text: 'Chào em. Ta sẽ điều chỉnh nhịp nghỉ từng bước; em ghi lại giờ đi ngủ 5 ngày tới nhé.', time: '08:45' },
];

const DEMO_WEIGHT = [
  { week: 'T1', kg: 62.8, date: '' },
  { week: 'T2', kg: 62.4, date: '' },
  { week: 'T3', kg: 62.1, date: '' },
  { week: 'T4', kg: 61.7, date: '' },
  { week: 'T5', kg: 61.5, date: '' },
  { week: 'T6', kg: 61.2, date: '' },
  { week: 'T7', kg: 60.9, date: '' },
  { week: 'T8', kg: 60.8, date: '' },
  { week: 'T9', kg: 60.6, date: '' },
  { week: 'T10', kg: 60.5, date: '' },
  { week: 'T11', kg: 60.4, date: '' },
  { week: 'T12', kg: 60.5, date: '' },
];

function formatClock(ts: number) {
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatShortDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d}/${m}`;
}

function buildChatFromDetail(d: PatientDetail): ChatMsg[] {
  const rows: { ts: number; msg: ChatMsg }[] = [];
  for (const b of d.botMessages) {
    const role: ChatRole = b.role === 'assistant' ? 'bot' : 'patient';
    rows.push({
      ts: b.ts,
      msg: { id: `b-${b.id}`, role, text: b.content, time: formatClock(b.ts) },
    });
  }
  for (const l of d.liveMessages) {
    rows.push({
      ts: l.ts,
      msg: {
        id: `l-${l.id}`,
        role: l.senderRole === 'expert' ? 'doctor' : 'patient',
        text: l.content,
        time: formatClock(l.ts),
      },
    });
  }
  rows.sort((a, b) => a.ts - b.ts);
  return rows.map((r) => r.msg);
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
  const [messages, setMessages] = useState<ChatMsg[]>(DEMO_CHAT);
  const [draft, setDraft] = useState('');
  const [wsReady, setWsReady] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const [patientList, setPatientList] = useState<PatientRow[]>([]);
  const [search, setSearch] = useState('');

  const loadDetail = useCallback(() => {
    if (!token || !patientId) {
      setDetail(null);
      setLoadError('');
      setMessages(DEMO_CHAT);
      return;
    }
    setLoading(true);
    apiFetch<PatientDetail>(`/api/expert/patients/${patientId}`, { token })
      .then((d) => {
        setDetail(d);
        setMessages(buildChatFromDetail(d));
        setLoadError('');
      })
      .catch((e) => {
        setDetail(null);
        setLoadError(e instanceof Error ? e.message : 'Không tải được hồ sơ');
        setMessages([]);
      })
      .finally(() => setLoading(false));
  }, [token, patientId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!token) return;
    apiFetch<{ patients: PatientRow[] }>('/api/expert/patients', { token })
      .then((r) => setPatientList(r.patients || []))
      .catch(() => setPatientList([]));
  }, [token]);

  useEffect(() => {
    if (!token || !patientId) {
      wsRef.current?.close();
      wsRef.current = null;
      setWsReady(false);
      return;
    }
    const ws = new WebSocket(wsUrl(token));
    wsRef.current = ws;
    ws.onopen = () => {
      setWsReady(true);
      ws.send(JSON.stringify({ type: 'join', patientId }));
    };
    ws.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data as string) as { type: string; message?: LiveMessage };
        if (d.type === 'live_message' && d.message) {
          const lm = d.message;
          const msg: ChatMsg = {
            id: `l-${lm.id}`,
            role: lm.senderRole === 'expert' ? 'doctor' : 'patient',
            text: lm.content,
            time: formatClock(lm.ts),
          };
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        }
      } catch {
        /* ignore */
      }
    };
    ws.onclose = () => setWsReady(false);
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [token, patientId]);

  const emergencyCount = useMemo(() => countUrgentPatients(patientList), [patientList]);

  const filteredPatients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patientList.slice(0, 8);
    return patientList
      .filter((p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
      .slice(0, 8);
  }, [patientList, search]);

  const weightSeries = useMemo(() => {
    if (detail?.bmi?.length) return buildWeightSeries(detail.bmi);
    return DEMO_WEIGHT;
  }, [detail?.bmi]);

  const heatCells = useMemo(() => {
    if (detail?.moods) return buildMoodHeatmap(detail.moods);
    return Array.from({ length: 30 }, (_, i) => ({
      key: `demo-${i}`,
      cls: 'bg-slate-200',
      label: 'Chọn bệnh nhân để xem dữ liệu',
    }));
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
  const patientLabel = detail?.patient.name ?? (patientId ? `BN ${patientId.slice(0, 8)}…` : 'Chưa chọn bệnh nhân');

  const sendDoctor = () => {
    const t = draft.trim();
    if (!t) return;
    if (liveMode && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', patientId, text: t }));
      setDraft('');
      return;
    }
    if (!liveMode) {
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'doctor', text: t, time }]);
      setDraft('');
    }
  };

  const quickReply = (text: string) => {
    if (liveMode && wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'message', patientId, text }));
      setDraft('');
      return;
    }
    if (!liveMode) {
      const now = new Date();
      const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'doctor', text, time }]);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-100 text-slate-900 font-[Inter,ui-sans-serif,system-ui,sans-serif] tabular-nums">
      <div className="lg:hidden shrink-0 flex items-center justify-between gap-3 px-3 py-2.5 bg-[#0c1929] text-slate-200 border-b border-slate-800/80">
        <span className="text-sm font-semibold text-white truncate">Tezca · Doctor Desk</span>
        <Link to={ROUTES.expert.root} className="text-xs font-medium text-teal-300 hover:text-teal-200 shrink-0">
          Danh sách
        </Link>
      </div>
      <div className="flex flex-1 min-h-0">
        <aside className="hidden lg:flex w-[15%] min-w-[200px] max-w-[260px] shrink-0 flex-col bg-[#0c1929] text-slate-200 border-r border-slate-800/80">
          <div className="p-5 border-b border-slate-700/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center text-[#0c1929] font-bold text-sm shrink-0">
              Tz
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-teal-300/90 uppercase tracking-wide m-0">Tezca</p>
              <p className="text-sm font-semibold text-white truncate m-0">Doctor Desk</p>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            <SidebarLink to={ROUTES.expert.root} end icon={LayoutDashboard} label="Danh sách BN" />
            <SidebarLink
              to={ROUTES.expert.doctorDesk}
              icon={MessageSquare}
              label="Doctor Desk"
              badge={emergencyCount}
              matchPrefix="/expert/doctor-desk"
            />
            <SidebarLink
              to={ROUTES.expert.settings}
              icon={Settings}
              label="Cài đặt"
              matchPrefix="/expert/settings"
            />
          </nav>
          <div className="p-4 text-[10px] text-slate-500 leading-snug border-t border-slate-700/60">
            Dữ liệu BMI / cảm xúc / chat đồng bộ từ server khi đã chọn bệnh nhân.
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <header className="h-16 shrink-0 flex items-center gap-3 md:gap-4 px-3 md:px-6 bg-white border-b border-slate-200/90 shadow-sm">
            <div className="flex-1 max-w-xl relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm bệnh nhân theo tên hoặc email…"
                className="w-full h-10 pl-10 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500/50"
                aria-label="Tìm kiếm bệnh nhân"
              />
              {search.trim() && (
                <div className="absolute left-0 right-0 top-full mt-1 rounded-lg border border-slate-200 bg-white shadow-lg z-50 max-h-56 overflow-y-auto">
                  {filteredPatients.length === 0 ? (
                    <p className="text-xs text-slate-500 px-3 py-2 m-0">Không khớp bệnh nhân.</p>
                  ) : (
                    filteredPatients.map((p) => (
                      <Link
                        key={p.id}
                        to={`${ROUTES.expert.doctorDesk}/${p.id}`}
                        className="block px-3 py-2 text-sm text-slate-800 hover:bg-teal-50 border-b border-slate-50 last:border-0"
                        onClick={() => setSearch('')}
                      >
                        <span className="font-medium">{p.name}</span>
                        <span className="block text-xs text-slate-500 truncate">{p.email}</span>
                      </Link>
                    ))
                  )}
                </div>
              )}
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

          {!patientId && (
            <div className="shrink-0 mx-3 mt-3 rounded-lg border border-teal-200 bg-teal-50/80 px-3 py-2 text-xs text-teal-900">
              Chọn bệnh nhân từ <Link className="font-semibold underline" to={ROUTES.expert.root}>danh sách</Link> (nút
              Doctor Desk) hoặc gõ tìm ở trên để mở hồ sơ — biểu đồ bên phải đang dùng dữ liệu demo.
            </div>
          )}

          <div className="flex-1 flex min-h-0 flex-col lg:flex-row">
            <section className="w-full lg:w-[40%] shrink-0 flex flex-col min-h-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
                <div className="min-w-0">
                  <h1 className="text-sm font-semibold text-slate-800 m-0 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-teal-600 shrink-0" />
                    Live Chat
                  </h1>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">
                    {liveMode ? (
                      <>
                        WebSocket:{' '}
                        {wsReady ? (
                          <span className="text-emerald-600 font-medium">đã kết nối</span>
                        ) : (
                          <span className="text-amber-600">đang kết nối…</span>
                        )}
                      </>
                    ) : (
                      'Chế độ demo — chưa gửi lên server'
                    )}
                  </p>
                </div>
                <Link to={ROUTES.expert.root} className="text-xs font-medium text-teal-700 hover:text-teal-800 shrink-0">
                  ← Danh sách
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

              <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-3">
                {messages.length === 0 && !loading && (
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
                    {m.role === 'bot' && (
                      <div className="max-w-[92%] rounded-2xl rounded-tl-sm border border-slate-200/80 bg-slate-100 px-3.5 py-2.5 flex gap-2">
                        <Bot className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" aria-hidden />
                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide m-0 mb-1">
                            AI tiền sàng
                          </p>
                          <p className="text-sm text-slate-700 m-0 leading-relaxed">{m.text}</p>
                          <p className="text-[10px] text-slate-400 mt-1.5 m-0">{m.time}</p>
                        </div>
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
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
                <div className="flex flex-wrap gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => quickReply('Bác sĩ gửi thực đơn mẫu trong ngày — em xem và phản hồi nhé.')}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-teal-200 bg-white text-teal-800 hover:bg-teal-50 inline-flex items-center gap-1.5 disabled:opacity-40"
                    disabled={liveMode && !wsReady}
                  >
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                    Gửi thực đơn
                  </button>
                  <button
                    type="button"
                    onClick={() => quickReply('Nhắc bài tập thở 4-7-8 (4 phút) — làm tối nay trước khi ngủ.')}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-teal-200 bg-white text-teal-800 hover:bg-teal-50 inline-flex items-center gap-1.5 disabled:opacity-40"
                    disabled={liveMode && !wsReady}
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
                    placeholder={liveMode ? 'Soạn tin (gửi qua WebSocket)…' : 'Soạn tin (demo)…'}
                    className="flex-1 min-w-0 h-11 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/25 bg-white disabled:bg-slate-100"
                    disabled={liveMode && !wsReady}
                  />
                  <button
                    type="button"
                    onClick={sendDoctor}
                    className="h-11 w-11 shrink-0 rounded-xl bg-[#0c1929] text-white flex items-center justify-center hover:bg-slate-800 disabled:opacity-40"
                    aria-label="Gửi"
                    disabled={liveMode && !wsReady}
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
                      {detail?.bmi?.length ? 'Theo dữ liệu BMI đã lưu' : 'Dữ liệu demo'}
                    </p>
                  </div>
                  <Activity className="w-5 h-5 text-teal-600 shrink-0" aria-hidden />
                </div>
                <div className="h-[240px] w-full min-h-[220px]">
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
                </div>
              </div>

              <div className="rounded-xl bg-white border border-slate-200/80 shadow-sm p-4 md:p-5">
                <h2 className="text-sm font-semibold text-slate-800 m-0 mb-1">Emotion Heatmap</h2>
                <p className="text-xs text-slate-500 m-0 mb-3">
                  30 ngày gần nhất — theo điểm cảm xúc (1–5) trong nhật ký
                </p>
                <div className="grid grid-cols-10 gap-1.5 max-w-md">
                  {heatCells.map((c) => (
                    <div
                      key={c.key}
                      title={c.label}
                      className={`aspect-square rounded-sm ${c.cls} ring-1 ring-white/40`}
                    />
                  ))}
                </div>
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

function SidebarLink({
  to,
  icon: Icon,
  label,
  badge,
  end,
  matchPrefix,
}: {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  badge?: number;
  end?: boolean;
  matchPrefix?: string;
}) {
  const { pathname } = useLocation();
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => {
        const active = matchPrefix ? pathname.startsWith(matchPrefix) : isActive;
        return `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative ${
          active ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`;
      }}
    >
      <Icon className="w-4 h-4 shrink-0 opacity-90" />
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 ? (
        <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-rose-600 text-white text-[11px] font-semibold flex items-center justify-center">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </NavLink>
  );
}
