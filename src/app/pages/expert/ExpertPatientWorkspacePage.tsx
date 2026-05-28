import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { apiFetch } from '../../lib/api';
import { useLiveChat } from '../../lib/liveChat';
import { useExpertAuth } from '../../context/ExpertAuthContext';
import { ROUTES } from '../../routes';
import { ExpertTrainingPlanPanel } from '../../components/expert/ExpertTrainingPlanPanel';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';

const chartGrid = tezcaTheme.border;
const chartTick = tezcaTheme.textMuted;
const chartTooltip = { background: tezcaTheme.surface, border: `1px solid ${tezcaTheme.borderStrong}`, color: tezcaTheme.text };

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
  const [draft, setDraft] = useState('');

  const live = useLiveChat({
    token,
    patientId,
    historyUrl: patientId ? `/api/expert/patients/${encodeURIComponent(patientId)}/live-messages` : '',
    sendUrl: patientId ? `/api/expert/patients/${encodeURIComponent(patientId)}/live-messages` : '',
    senderRole: 'expert',
    enabled: Boolean(token && patientId),
  });

  const load = useCallback(() => {
    if (!token || !patientId) return;
    apiFetch<PatientDetail>(`/api/expert/patients/${patientId}`, { token })
      .then((d) => {
        setDetail(d);
        setError('');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Không tải được hồ sơ'));
  }, [token, patientId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setDraft('');
  }, [patientId]);

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

  const sendLive = async () => {
    const text = draft.trim();
    if (!text || !live.ready) return;
    const ok = await live.send(text);
    if (ok) setDraft('');
  };

  if (!patientId) return null;

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-4" style={{ color: tezcaTheme.text }}>
      <div className="flex flex-wrap items-center gap-4">
        <Link
          to={ROUTES.expert.root}
          className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100"
          style={{ color: tezcaTheme.text }}
        >
          <ArrowLeft size={18} />
          Danh sách
        </Link>
        {detail && (
          <div>
            <h1 className="text-xl font-bold m-0">{detail.patient.name}</h1>
            <p className="text-xs m-0" style={{ color: tezcaTheme.textMuted }}>
              {detail.patient.email}
            </p>
          </div>
        )}
        <span className="text-xs ml-auto flex items-center gap-3 flex-wrap justify-end" style={{ color: tezcaTheme.textMuted }}>
          <Link
            to={`${ROUTES.expert.doctorDesk}/${patientId}`}
            className="font-medium hover:underline"
            style={{ color: tezcaTheme.accentDark }}
          >
            Mở Doctor Desk
          </Link>
          <span>
            {live.transportLabel}
            {live.ready ? <span style={{ color: tezcaTheme.accentDark }}> · sẵn sàng</span> : ' · đang tải…'}
          </span>
        </span>
      </div>

      {error && <p className="text-red-600 text-sm m-0">{error}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <section className="xl:col-span-5 rounded-2xl border p-4 flex flex-col min-h-[380px]" style={tezcaCardStyle}>
          <h2 className="text-sm font-semibold mb-3 m-0" style={{ color: tezcaTheme.accentDark }}>
            Trò chuyện trực tiếp
          </h2>
          <div
            key={patientId}
            className="flex-1 overflow-y-auto space-y-2 mb-3 rounded-xl p-3 max-h-[320px]"
            style={{ backgroundColor: tezcaTheme.subtleBg }}
          >
            {live.sendError && (
              <p className="text-xs text-rose-600 text-center py-2 m-0">{live.sendError}</p>
            )}
            {live.loading && (
              <p className="text-xs text-center py-8 m-0" style={{ color: tezcaTheme.textMuted }}>
                Đang tải lịch sử chat…
              </p>
            )}
            {!live.loading && live.messages.length === 0 && (
              <p className="text-xs text-center py-8 m-0" style={{ color: tezcaTheme.textMuted }}>
                Chưa có tin nhắn. Hãy nhắn để bệnh nhân thấy trên app.
              </p>
            )}
            {live.messages.map((m) => {
              const mine = m.senderRole === 'expert' && user && m.senderUserId === user.id;
              return (
                <div
                  key={m.id}
                  className={`text-sm rounded-xl px-3 py-2 max-w-[90%] ${
                    mine ? 'ml-auto text-white' : 'mr-auto border'
                  }`}
                  style={
                    mine
                      ? { background: tezcaTheme.accentGradient }
                      : { backgroundColor: tezcaTheme.surface, borderColor: tezcaTheme.border, color: tezcaTheme.text }
                  }
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
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), void sendLive())}
              placeholder={live.ready ? 'Nhắn cho bệnh nhân…' : 'Đang kết nối…'}
              disabled={!live.ready || live.sending}
              className="flex-1 rounded-xl border px-4 py-2 text-sm disabled:opacity-50"
              style={{ borderColor: tezcaTheme.borderStrong, backgroundColor: tezcaTheme.surface, color: tezcaTheme.text }}
            />
            <button
              type="button"
              onClick={sendLive}
              disabled={!live.ready || live.sending || !draft.trim()}
              className="rounded-xl px-4 py-2 text-white disabled:opacity-40 hover:opacity-90"
              style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
              aria-label="Gửi"
            >
              <Send size={18} />
            </button>
          </div>
        </section>

        <section className="xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border p-4" style={tezcaCardStyle}>
            <h2 className="text-sm font-semibold mb-3 m-0" style={{ color: tezcaTheme.accentDark }}>
              BMI
            </h2>
            {bmiChart.length === 0 ? (
              <p className="text-xs py-6 text-center m-0" style={{ color: tezcaTheme.textMuted }}>
                Chưa có dữ liệu
              </p>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bmiChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTick }} />
                    <YAxis tick={{ fontSize: 10, fill: chartTick }} />
                    <Tooltip contentStyle={chartTooltip} />
                    <Line type="monotone" dataKey="bmi" stroke="#2dd4bf" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="rounded-2xl border p-4" style={tezcaCardStyle}>
            <h2 className="text-sm font-semibold mb-3 m-0" style={{ color: tezcaTheme.accentDark }}>
              Cảm xúc (1–5)
            </h2>
            {moodChart.length === 0 ? (
              <p className="text-xs py-6 text-center m-0" style={{ color: tezcaTheme.textMuted }}>
                Chưa có nhật ký
              </p>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moodChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTick }} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: chartTick }} />
                    <Tooltip contentStyle={chartTooltip} />
                    <Bar dataKey="score" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>

        {token && <ExpertTrainingPlanPanel token={token} patientId={patientId} />}

        <section className="xl:col-span-12 rounded-2xl border p-4" style={tezcaCardStyle}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
            <div>
              <h2 className="text-sm font-semibold m-0" style={{ color: tezcaTheme.accentDark }}>
                Tezca AI — hội thoại tham khảo
              </h2>
              <p className="text-xs mt-1 m-0 max-w-2xl" style={{ color: tezcaTheme.textMuted }}>
                Nội dung do trợ lý AI tạo ra, mang tính tham khảo; không thay cho hồ sơ khám hay quyết định điều trị.
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              className="text-xs shrink-0 self-start hover:underline border-0 bg-transparent cursor-pointer"
              style={{ color: tezcaTheme.accentDark }}
            >
              Làm mới hồ sơ
            </button>
          </div>
          {!detail?.botMessages?.length ? (
            <p className="text-xs m-0" style={{ color: tezcaTheme.textMuted }}>
              Chưa có hội thoại Tezca AI.
            </p>
          ) : (
            <ul className="space-y-2 max-h-56 overflow-y-auto text-sm">
              {detail.botMessages.map((m) => (
                <li key={m.id} className="border-l-2 pl-3" style={{ borderColor: tezcaTheme.accent }}>
                  <span className="text-xs mr-2 opacity-60">{m.role === 'user' ? 'BN' : 'AI'}</span>
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
