import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
import {
  ArrowLeft,
  UtensilsCrossed,
  Wind,
  LayoutDashboard,
  Sparkles,
  User,
  Stethoscope,
  Activity,
  Heart,
  FileText,
  TrendingUp,
  SmilePlus,
  RefreshCw,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { isApiError } from '../../lib/apiError';
import { useLiveChat, type LiveMessage } from '../../lib/liveChat';
import { useExpertAuth } from '../../context/ExpertAuthContext';
import { ROUTES, expertDoctorDeskPath } from '../../routes';
import { ExpertTrainingPlanPanel } from '../../components/expert/ExpertTrainingPlanPanel';
import { LiveChatPanel } from '../../components/LiveChatPanel';
import { CustomerIntakeSummary } from '../../components/CustomerIntakeSummary';
import type { CustomerBasicProfile } from '../../components/CustomerProfileForm';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';

const chartGrid = tezcaTheme.border;
const chartTick = tezcaTheme.textMuted;
const chartTooltip = {
  background: tezcaTheme.surface,
  border: `1px solid ${tezcaTheme.borderStrong}`,
  color: tezcaTheme.text,
  borderRadius: '12px',
  boxShadow: '0 8px 24px -8px rgba(26,32,44,0.15)',
};

type CustomerDetail = {
  customer: { id: string; email: string; name: string };
  profile?: CustomerBasicProfile | null;
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

function SectionHeader({ icon, title, action }: { icon: ReactNode; title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'linear-gradient(135deg, rgba(45,212,191,0.2) 0%, rgba(20,184,166,0.1) 100%)', color: tezcaTheme.accentDark }}
      >
        {icon}
      </div>
      <h2 className="text-sm font-bold m-0 flex-1" style={{ color: tezcaTheme.text }}>
        {title}
      </h2>
      {action}
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl px-4 py-3 gap-0.5"
      style={{ backgroundColor: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.15)' }}
    >
      <span className="text-lg font-bold" style={{ color: color ?? tezcaTheme.accentDark }}>
        {value}
      </span>
      <span className="text-[11px]" style={{ color: tezcaTheme.textMuted }}>
        {label}
      </span>
    </div>
  );
}

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

  const latestBmi = bmiChart.length > 0 ? bmiChart[bmiChart.length - 1].bmi : null;
  const latestMood = moodChart.length > 0 ? moodChart[moodChart.length - 1].score : null;

  const sendLive = async () => {
    const text = draft.trim();
    if (!text || !live.ready) return;
    const ok = await live.send(text);
    if (ok) setDraft('');
  };

  if (!customerId) return null;

  return (
    <div className="space-y-6 w-full" style={{ color: tezcaTheme.text }}>
      {/* Page header */}
      <div
        className="rounded-2xl p-5 md:p-6 overflow-hidden relative"
        style={{
          background: 'linear-gradient(135deg, rgba(45,212,191,0.12) 0%, rgba(255,255,255,0.97) 60%, #F9F9FB 100%)',
          border: `1px solid ${tezcaTheme.borderStrong}`,
          boxShadow: '0 8px 32px -16px rgba(20,184,166,0.2)',
        }}
      >
        <div className="absolute -top-8 -right-6 w-32 h-32 rounded-full opacity-20 blur-2xl pointer-events-none bg-teal-400" />
        <div className="relative flex flex-wrap items-center gap-3">
          <Link
            to={ROUTES.expert.customers.root}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full border transition-all hover:opacity-80 no-underline"
            style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.textMuted, backgroundColor: tezcaTheme.surface }}
          >
            <ArrowLeft size={14} />
            Danh sách
          </Link>
          {detail ? (
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ background: tezcaTheme.accentGradient, boxShadow: '0 4px 12px -4px rgba(20,184,166,0.5)' }}
              >
                {detail.customer.name.trim().split(/\s+/).slice(-1)[0]?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold m-0 leading-tight">{detail.customer.name}</h1>
                <p className="text-xs m-0 mt-0.5" style={{ color: tezcaTheme.textMuted }}>
                  {detail.customer.email}
                </p>
              </div>
            </div>
          ) : !loading && !forbidden ? (
            <h1 className="text-xl md:text-2xl font-bold m-0">Hồ sơ khách hàng</h1>
          ) : null}
          <Link
            to={expertDoctorDeskPath(customerId)}
            className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-full no-underline transition-all hover:scale-[1.03] active:scale-[0.97]"
            style={{
              background: tezcaTheme.accentGradient,
              color: '#fff',
              boxShadow: '0 4px 14px -4px rgba(20,184,166,0.5)',
            }}
          >
            <LayoutDashboard size={13} />
            Doctor Desk
          </Link>
        </div>

        {/* Quick stats */}
        {detail && (latestBmi !== null || latestMood !== null || detail.botMessages.length > 0) && (
          <div className="relative flex flex-wrap gap-2 mt-4 pt-4 border-t" style={{ borderColor: tezcaTheme.border }}>
            {latestBmi !== null && <StatBadge label="BMI gần nhất" value={latestBmi.toFixed(1)} />}
            {latestMood !== null && <StatBadge label="Tâm trạng" value={`${latestMood}/5`} />}
            <StatBadge label="Hội thoại AI" value={detail.botMessages.length} />
            <StatBadge label="Tin nhắn trực tiếp" value={live.messages.length} />
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-3 py-4">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: tezcaTheme.accentGradient }}
          >
            <RefreshCw size={15} className="text-white animate-spin" />
          </div>
          <p className="text-sm m-0" style={{ color: tezcaTheme.textMuted }}>
            Đang kiểm tra quyền và tải hồ sơ khách hàng…
          </p>
        </div>
      )}

      {forbidden && (
        <section className="rounded-2xl border p-8 text-center" style={tezcaCardStyle}>
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#dc2626' }}
          >
            <User size={24} />
          </div>
          <p className="text-sm font-semibold m-0" style={{ color: tezcaTheme.text }}>
            Bạn không có quyền xem hồ sơ khách hàng này.
          </p>
          <Link
            to={ROUTES.expert.customers.root}
            className="inline-flex items-center gap-1.5 mt-4 text-sm font-semibold no-underline"
            style={{ color: tezcaTheme.accentDark }}
          >
            <ArrowLeft size={14} />
            Quay lại danh sách
          </Link>
        </section>
      )}

      {error && !forbidden && (
        <p className="text-red-600 text-sm m-0 px-1">{error}</p>
      )}

      {!forbidden && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Live chat panel */}
          <section
            className="xl:col-span-5 rounded-2xl border p-4 flex flex-col min-h-[540px]"
            style={{
              ...tezcaCardStyle,
              background: 'linear-gradient(160deg, rgba(45,212,191,0.05) 0%, #ffffff 100%)',
            }}
          >
            <SectionHeader
              icon={<Stethoscope size={14} />}
              title="Nhắn tin trực tiếp"
            />
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

          {/* Right column: profile & charts */}
          <section className="xl:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer profile */}
            <div className="rounded-2xl border p-4 md:col-span-2" style={tezcaCardStyle}>
              <SectionHeader icon={<User size={14} />} title="Hồ sơ khách hàng" />
              <CustomerIntakeSummary
                intake={{
                  profile: detail?.profile ?? null,
                  healthProfile: detail?.healthProfile ?? null,
                }}
              />
            </div>

            {/* BMI chart */}
            <div className="rounded-2xl border p-4" style={tezcaCardStyle}>
              <SectionHeader icon={<TrendingUp size={14} />} title="Chỉ số BMI" />
              {bmiChart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Activity size={22} style={{ color: tezcaTheme.textMuted, opacity: 0.5 }} />
                  <p className="text-xs m-0" style={{ color: tezcaTheme.textMuted }}>
                    Chưa có dữ liệu
                  </p>
                </div>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={bmiChart}>
                      <defs>
                        <linearGradient id="bmiGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTick }} />
                      <YAxis tick={{ fontSize: 10, fill: chartTick }} />
                      <Tooltip contentStyle={chartTooltip} />
                      <Line
                        type="monotone"
                        dataKey="bmi"
                        stroke="#14B8A6"
                        strokeWidth={2.5}
                        dot={{ fill: '#14B8A6', r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: '#0F766E' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Mood chart */}
            <div className="rounded-2xl border p-4" style={tezcaCardStyle}>
              <SectionHeader icon={<SmilePlus size={14} />} title="Cảm xúc (1–5)" />
              {moodChart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Heart size={22} style={{ color: tezcaTheme.textMuted, opacity: 0.5 }} />
                  <p className="text-xs m-0" style={{ color: tezcaTheme.textMuted }}>
                    Chưa có nhật ký
                  </p>
                </div>
              ) : (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={moodChart}>
                      <defs>
                        <linearGradient id="moodGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#2DD4BF" stopOpacity={1} />
                          <stop offset="100%" stopColor="#14B8A6" stopOpacity={0.8} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTick }} />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 10, fill: chartTick }} />
                      <Tooltip contentStyle={chartTooltip} />
                      <Bar dataKey="score" fill="url(#moodGrad)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Health profile */}
            <div className="rounded-2xl border p-4 md:col-span-2" style={tezcaCardStyle}>
              <SectionHeader icon={<FileText size={14} />} title="Hồ sơ bệnh lý" />
              {detail?.healthProfile ? (
                <CustomerIntakeSummary
                  intake={{ profile: null, healthProfile: detail.healthProfile }}
                  title=""
                  compact
                />
              ) : (
                <div className="flex items-center gap-2 py-2">
                  <span
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: 'rgba(245,158,11,0.1)', color: '#b45309' }}
                  >
                    Chưa cập nhật
                  </span>
                  <p className="text-xs m-0" style={{ color: tezcaTheme.textMuted }}>
                    Khách hàng chưa cập nhật hồ sơ bệnh lý.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Training plan panel */}
          {token && <ExpertTrainingPlanPanel token={token} customerId={customerId} />}

          {/* Tezca AI transcript */}
          <section className="xl:col-span-12 rounded-2xl border p-5 md:p-6" style={tezcaCardStyle}>
            <SectionHeader
              icon={<Sparkles size={14} />}
              title="Hội thoại Tezca AI"
              action={
                <button
                  type="button"
                  onClick={load}
                  className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border hover:opacity-80 transition-opacity"
                  style={{ borderColor: tezcaTheme.border, color: tezcaTheme.accentDark, backgroundColor: 'rgba(45,212,191,0.06)' }}
                >
                  <RefreshCw size={12} />
                  Làm mới
                </button>
              }
            />
            {!detail?.botMessages?.length ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, rgba(45,212,191,0.12) 0%, rgba(20,184,166,0.06) 100%)', border: '1.5px dashed rgba(20,184,166,0.3)' }}
                >
                  <Sparkles size={20} style={{ color: tezcaTheme.textMuted }} />
                </div>
                <p className="text-sm m-0" style={{ color: tezcaTheme.textMuted }}>
                  Chưa có hội thoại Tezca AI.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {detail.botMessages.map((m) => {
                  const isAi = m.role === 'assistant';
                  return (
                    <div
                      key={m.id}
                      className={`flex gap-2.5 ${isAi ? 'flex-row' : 'flex-row-reverse'}`}
                    >
                      <div
                        className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center mt-0.5"
                        style={
                          isAi
                            ? { background: tezcaTheme.accentGradient, color: '#fff' }
                            : { backgroundColor: 'rgba(26,32,44,0.08)', color: tezcaTheme.text }
                        }
                      >
                        {isAi ? <Sparkles size={13} /> : <User size={13} />}
                      </div>
                      <div
                        className="max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                        style={
                          isAi
                            ? {
                                backgroundColor: 'rgba(45,212,191,0.08)',
                                border: '1px solid rgba(45,212,191,0.2)',
                                color: tezcaTheme.text,
                                borderBottomLeftRadius: '6px',
                              }
                            : {
                                background: 'linear-gradient(135deg, rgba(26,32,44,0.07) 0%, rgba(26,32,44,0.04) 100%)',
                                color: tezcaTheme.text,
                                borderBottomRightRadius: '6px',
                              }
                        }
                      >
                        {m.content.length > 300 ? `${m.content.slice(0, 300)}…` : m.content}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
