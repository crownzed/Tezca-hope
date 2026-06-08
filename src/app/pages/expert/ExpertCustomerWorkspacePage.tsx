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
import { ArrowLeft, UtensilsCrossed, Wind } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { isApiError } from '../../lib/apiError';
import { useLiveChat, type LiveMessage } from '../../lib/liveChat';
import { useExpertAuth } from '../../context/ExpertAuthContext';
import { ROUTES, expertDoctorDeskPath } from '../../routes';
import { ExpertTrainingPlanPanel } from '../../components/expert/ExpertTrainingPlanPanel';
import { LiveChatPanel } from '../../components/LiveChatPanel';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';

const chartGrid = tezcaTheme.border;
const chartTick = tezcaTheme.textMuted;
const chartTooltip = { background: tezcaTheme.surface, border: `1px solid ${tezcaTheme.borderStrong}`, color: tezcaTheme.text };

type CustomerDetail = {
  customer: { id: string; email: string; name: string };
  bmi: { id: string; date: string; heightCm: number; weightKg: number; bmi: number }[];
  moods: { id: string; date: string; moodLabel: string; moodScore: number; note: string }[];
  botMessages: { id: string; role: string; content: string; ts: number }[];
  liveMessages: LiveMessage[];
  healthProfile?: {
    currentConditions?: string;
    medicalHistory?: string;
    allergies?: string;
    medications?: string;
    contraindications?: string;
  } | null;
};

export function ExpertCustomerWorkspacePage() {
  const { customerId } = useParams<{ customerId: string }>();
  const { token, user } = useExpertAuth();
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');

  const live = useLiveChat({
    token,
    customerId,
    historyUrl: customerId ? `/api/expert/customers/${encodeURIComponent(customerId)}/live-messages` : '',
    sendUrl: customerId ? `/api/expert/customers/${encodeURIComponent(customerId)}/live-messages` : '',
    senderRole: 'expert',
    enabled: Boolean(token && customerId),
  });

  const load = useCallback(() => {
    if (!token || !customerId) return;
    setLoading(true);
    apiFetch<CustomerDetail>(`/api/expert/customers/${customerId}`, { token })
      .then((d) => {
        setDetail(d);
        setError('');
        setForbidden(false);
      })
      .catch((e) => {
        setDetail(null);
        const msg = e instanceof Error ? e.message : 'Không tải được hồ sơ';
        setError(msg);
        setForbidden(isApiError(e) && e.status === 403);
      })
      .finally(() => setLoading(false));
  }, [token, customerId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setDraft('');
  }, [customerId]);

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

  if (!customerId) return null;

  return (
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-4" style={{ color: tezcaTheme.text }}>
      <div className="flex flex-wrap items-center gap-4">
        <Link
          to={ROUTES.expert.customers.root}
          className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100"
          style={{ color: tezcaTheme.text }}
        >
          <ArrowLeft size={18} />
          Danh sách khách hàng
        </Link>
        {detail && <h1 className="text-xl font-bold m-0">Hồ sơ khách hàng · {detail.customer.name}</h1>}
        {!detail && !loading && !forbidden && (
          <h1 className="text-xl font-bold m-0">Hồ sơ khách hàng</h1>
        )}
        <Link
          to={expertDoctorDeskPath(customerId)}
          className="text-sm ml-auto font-medium hover:underline"
          style={{ color: tezcaTheme.accentDark }}
        >
          Mở Doctor Desk
        </Link>
      </div>

      {loading && (
        <p className="text-sm m-0" style={{ color: tezcaTheme.textMuted }}>
          Đang kiểm tra quyền và tải hồ sơ khách hàng…
        </p>
      )}

      {forbidden && (
        <section className="rounded-2xl border p-6 text-center" style={tezcaCardStyle}>
          <p className="text-sm font-medium m-0" style={{ color: tezcaTheme.text }}>
            Bạn không có quyền xem hồ sơ khách hàng này.
          </p>
          <Link
            to={ROUTES.expert.customers.root}
            className="inline-block mt-4 text-sm font-medium hover:underline"
            style={{ color: tezcaTheme.accentDark }}
          >
            Quay lại danh sách khách hàng
          </Link>
        </section>
      )}

      {error && !forbidden && <p className="text-red-600 text-sm m-0">{error}</p>}

      {!forbidden && (
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <section className="xl:col-span-5 rounded-2xl border p-4 flex flex-col min-h-[520px]" style={tezcaCardStyle}>
          <LiveChatPanel
            className="flex-1 min-h-0"
            messages={live.messages}
            loading={live.loading}
            ready={live.ready}
            sending={live.sending}
            sendError={live.sendError}
            draft={draft}
            onDraftChange={setDraft}
            onSend={sendLive}
            viewer="expert"
            myUserId={user?.id}
            placeholder="Nhắn cho khách hàng…"
            header={{
              peerName: detail?.customer.name,
              peerEmail: detail?.customer.email,
              transportLabel: live.transportLabel,
              onRefresh: live.refresh,
            }}
            emptyTitle="Chưa có tin nhắn với khách hàng này"
            emptyHint="Gửi lời chào hoặc dùng mẫu trả lời nhanh để bắt đầu hỗ trợ."
            quickReplies={[
              {
                label: 'Gửi thực đơn',
                text: 'Bác sĩ gửi thực đơn mẫu trong ngày — em xem và phản hồi nhé.',
                icon: <UtensilsCrossed className="w-3.5 h-3.5" />,
              },
              {
                label: 'Bài tập thở',
                text: 'Nhắc bài tập thở 4-7-8 (4 phút) — làm tối nay trước khi ngủ.',
                icon: <Wind className="w-3.5 h-3.5" />,
              },
            ]}
            onQuickReply={async (text) => {
              if (!live.ready) return;
              await live.send(text);
            }}
          />
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
          <div className="rounded-2xl border p-4 md:col-span-2" style={tezcaCardStyle}>
            <h2 className="text-sm font-semibold mb-3 m-0" style={{ color: tezcaTheme.accentDark }}>
              Hồ sơ bệnh lý
            </h2>
            {detail?.healthProfile ? (
              <div className="text-sm space-y-2">
                <p className="m-0"><strong>Tình trạng hiện tại:</strong> {detail.healthProfile.currentConditions || 'Chưa cập nhật'}</p>
                <p className="m-0"><strong>Tiền sử:</strong> {detail.healthProfile.medicalHistory || 'Chưa cập nhật'}</p>
                <p className="m-0"><strong>Dị ứng:</strong> {detail.healthProfile.allergies || 'Chưa cập nhật'}</p>
                <p className="m-0"><strong>Thuốc đang dùng:</strong> {detail.healthProfile.medications || 'Chưa cập nhật'}</p>
                <p className="m-0"><strong>Chống chỉ định:</strong> {detail.healthProfile.contraindications || 'Chưa cập nhật'}</p>
              </div>
            ) : (
              <p className="text-xs py-2 m-0" style={{ color: tezcaTheme.textMuted }}>
                Khách hàng chưa cập nhật hồ sơ bệnh lý.
              </p>
            )}
          </div>
        </section>

        {token && <ExpertTrainingPlanPanel token={token} customerId={customerId} />}

        <section className="xl:col-span-12 rounded-2xl border p-4" style={tezcaCardStyle}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-sm font-semibold m-0" style={{ color: tezcaTheme.accentDark }}>
              Tezca AI
            </h2>
            <button
              type="button"
              onClick={load}
              className="text-sm shrink-0 hover:underline border-0 bg-transparent cursor-pointer"
              style={{ color: tezcaTheme.accentDark }}
            >
              Làm mới
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
                  {m.content.length > 280 ? `${m.content.slice(0, 280)}…` : m.content}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      )}
    </div>
  );
}
