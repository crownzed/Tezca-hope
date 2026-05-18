import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { ArrowLeft, Send } from 'lucide-react';
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

export function ExpertPatientWorkspacePage() {
  const { patientId } = useParams<{ patientId: string }>();
  const { token, user } = useExpertAuth();
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [error, setError] = useState('');
  const [liveMsgs, setLiveMsgs] = useState<LiveMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [wsReady, setWsReady] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const load = useCallback(() => {
    if (!token || !patientId) return;
    apiFetch<PatientDetail>(`/api/expert/patients/${patientId}`, { token })
      .then((d) => {
        setDetail(d);
        setLiveMsgs(d.liveMessages);
        setError('');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Không tải được hồ sơ'));
  }, [token, patientId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!token || !patientId) return;
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
          setLiveMsgs((prev) => (prev.some((m) => m.id === d.message!.id) ? prev : [...prev, d.message!]));
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

  const bmiChart = useMemo(
    () => [...(detail?.bmi ?? [])].sort((a, b) => a.date.localeCompare(b.date)).map((e) => ({ date: e.date, bmi: e.bmi })),
    [detail?.bmi],
  );
  const moodChart = useMemo(
    () =>
      [...(detail?.moods ?? [])].sort((a, b) => a.date.localeCompare(b.date)).map((m) => ({
        date: m.date,
        score: m.moodScore,
      })),
    [detail?.moods],
  );

  const sendLive = () => {
    const text = draft.trim();
    if (!text || !patientId || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'message', patientId, text }));
    setDraft('');
  };

  if (!patientId) return null;

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          to={ROUTES.expert.root}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-teal-400"
        >
          <ArrowLeft size={18} />
          Danh sách
        </Link>
        {detail && (
          <div>
            <h1 className="text-xl font-bold text-white">{detail.patient.name}</h1>
            <p className="text-xs text-slate-500">{detail.patient.email}</p>
          </div>
        )}
        <span className="text-xs text-slate-500 ml-auto flex items-center gap-3 flex-wrap justify-end">
          <Link
            to={`${ROUTES.expert.doctorDesk}/${patientId}`}
            className="font-medium text-teal-400 hover:text-teal-300"
          >
            Mở Doctor Desk
          </Link>
          <span>
            Chat: {wsReady ? <span className="text-teal-400">đã kết nối</span> : 'đang kết nối…'}
          </span>
        </span>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <section className="xl:col-span-5 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 flex flex-col min-h-[380px]">
          <h2 className="text-sm font-semibold text-teal-400 mb-3">Trò chuyện trực tiếp</h2>
          <div className="flex-1 overflow-y-auto space-y-2 mb-3 rounded-xl bg-slate-950/50 p-3 max-h-[320px]">
            {liveMsgs.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-8">Chưa có tin nhắn. Hãy nhắn để bệnh nhân thấy trên app.</p>
            )}
            {liveMsgs.map((m) => {
              const mine = m.senderRole === 'expert' && user && m.senderUserId === user.id;
              return (
                <div
                  key={m.id}
                  className={`text-sm rounded-xl px-3 py-2 max-w-[90%] ${
                    mine ? 'ml-auto bg-teal-600 text-white' : 'mr-auto bg-slate-800 text-slate-200'
                  }`}
                >
                  {m.content}
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendLive()}
              placeholder="Nhắn cho bệnh nhân…"
              className="flex-1 rounded-xl bg-slate-950 border border-slate-600 px-4 py-2 text-sm text-white placeholder:text-slate-500"
            />
            <button
              type="button"
              onClick={sendLive}
              className="rounded-xl bg-teal-500 px-4 py-2 text-slate-950 hover:bg-teal-400"
              aria-label="Gửi"
            >
              <Send size={18} />
            </button>
          </div>
        </section>

        <section className="xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <h2 className="text-sm font-semibold text-teal-400 mb-3">BMI</h2>
            {bmiChart.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Chưa có dữ liệu</p>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bmiChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #475569' }} />
                    <Line type="monotone" dataKey="bmi" stroke="#2dd4bf" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
            <h2 className="text-sm font-semibold text-teal-400 mb-3">Cảm xúc (1–5)</h2>
            {moodChart.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">Chưa có nhật ký</p>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moodChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #475569' }} />
                    <Bar dataKey="score" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>

        <section className="xl:col-span-12 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold text-teal-400 m-0">Tezca AI — hội thoại tham khảo</h2>
              <p className="text-xs text-slate-500 mt-1 m-0 max-w-2xl">
                Nội dung do trợ lý AI tạo ra, mang tính tham khảo; không thay cho hồ sơ khám hay quyết định điều trị.
              </p>
            </div>
            <button type="button" onClick={load} className="text-xs text-slate-500 hover:text-teal-400 shrink-0 self-start">
              Làm mới hồ sơ
            </button>
          </div>
          {!detail?.botMessages?.length ? (
            <p className="text-xs text-slate-500">Chưa có hội thoại Tezca AI.</p>
          ) : (
            <ul className="space-y-2 max-h-56 overflow-y-auto text-sm">
              {detail.botMessages.map((m) => (
                <li key={m.id} className="border-l-2 border-teal-500/40 pl-3 text-slate-300">
                  <span className="text-slate-500 text-xs mr-2">{m.role === 'user' ? 'BN' : 'AI'}</span>
                  {m.content.length > 280 ? `${m.content.slice(0, 280)}…` : m.content}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
