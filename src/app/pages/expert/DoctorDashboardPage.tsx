import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import {
  Activity,
  Bell,
  Bot,
  Loader2,
  MessageSquare,
  ChevronLeft,
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
import { ExpertCustomerList, type ExpertCustomerInboxRow } from '../../components/expert/ExpertCustomerList';
import { LiveChatPanel } from '../../components/LiveChatPanel';

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

type CustomerRow = ExpertCustomerInboxRow;

function formatShortDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${d}/${m}`;
}

function bumpCustomerPreview(list: CustomerRow[], msg: LiveMessage): CustomerRow[] {
  const next = list.map((p) =>
    p.id === msg.customerId
      ? {
          ...p,
          lastLiveMessage: {
            id: msg.id,
            content: msg.content,
            ts: msg.ts,
            senderRole: msg.senderRole,
          },
          needsReply: msg.senderRole === 'customer',
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

function buildWeightSeries(bmi: CustomerDetail['bmi']) {
  const sorted = [...bmi].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted.slice(-12);
  return last.map((e) => ({
    week: formatShortDate(e.date),
    kg: e.weightKg,
    date: e.date,
  }));
}

/** 30 ngày kết thúc hôm nay — map moodScore 1–5 → màu heat */
function buildMoodHeatmap(moods: CustomerDetail['moods']): { key: string; cls: string; label: string }[] {
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

function countUrgentCustomers(customers: CustomerRow[]) {
  return customers.filter((p) => (p.lastMood?.moodScore ?? 99) <= 2).length;
}

export function DoctorDashboardPage() {
  const { customerId } = useParams<{ customerId?: string }>();
  const { token, user } = useExpertAuth();
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAiContext, setShowAiContext] = useState(false);
  const [draft, setDraft] = useState('');

  const live = useLiveChat({
    token,
    customerId,
    historyUrl: customerId ? `/api/expert/customers/${encodeURIComponent(customerId)}/live-messages` : '',
    sendUrl: customerId ? `/api/expert/customers/${encodeURIComponent(customerId)}/live-messages` : '',
    senderRole: 'expert',
    enabled: Boolean(token && customerId),
    onIncoming: (m) => setCustomerList((prev) => bumpCustomerPreview(prev, m)),
  });
  const [customerList, setCustomerList] = useState<CustomerRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadDetail = useCallback(() => {
    if (!token || !customerId) {
      setDetail(null);
      setLoadError('');
      return;
    }
    setLoading(true);
    apiFetch<CustomerDetail>(`/api/expert/customers/${customerId}`, { token })
      .then((d) => {
        setDetail(d);
        setLoadError('');
      })
      .catch((e) => {
        setDetail(null);
        setLoadError(e instanceof Error ? e.message : 'Không tải được hồ sơ');
      })
      .finally(() => setLoading(false));
  }, [token, customerId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    setDraft('');
    setShowAiContext(false);
  }, [customerId]);

  const loadCustomerList = useCallback(() => {
    if (!token) return;
    setListLoading(true);
    apiFetch<{ customers: CustomerRow[] }>('/api/expert/customers', { token })
      .then((r) => setCustomerList(r.customers || []))
      .catch(() => setCustomerList([]))
      .finally(() => setListLoading(false));
  }, [token]);

  useEffect(() => {
    loadCustomerList();
  }, [loadCustomerList]);

  useEffect(() => {
    if (!token) return;
    const refreshList = () => {
      if (document.visibilityState === 'hidden') return;
      apiFetch<{ customers: CustomerRow[] }>('/api/expert/customers', { token })
        .then((r) => setCustomerList(r.customers || []))
        .catch(() => {});
    };
    const id = window.setInterval(refreshList, 15000);
    return () => clearInterval(id);
  }, [token]);

  const emergencyCount = useMemo(() => countUrgentCustomers(customerList), [customerList]);

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

  const liveMode = Boolean(customerId && detail);
  const customerLabel = detail?.customer.name ?? (customerId ? `KH ${customerId.slice(0, 8)}…` : 'Chưa chọn khách hàng');

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
        <Link to={ROUTES.home} className="text-sm font-semibold truncate no-underline" style={{ color: tezcaTheme.text }}>
          Tezca
        </Link>
        <Link to={ROUTES.expert.customers.root} className="text-xs font-medium shrink-0" style={{ color: tezcaTheme.accent }}>
          Danh sách khách hàng
        </Link>
      </div>
      <div className="flex flex-1 min-h-0 flex-col min-w-0">
          <header className="h-16 shrink-0 flex items-center gap-3 md:gap-4 px-3 md:px-6 bg-white border-b border-slate-200/90 shadow-sm">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 m-0 truncate">Doctor Desk</p>
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
              customers={customerList}
              activeCustomerId={customerId}
              search={search}
              onSearchChange={setSearch}
              loading={listLoading}
              className={`w-full max-w-md mx-auto lg:max-w-none lg:w-80 shrink-0 ${
                customerId ? 'hidden lg:flex' : 'flex'
              }`}
            />

            <div
              className={`flex-1 flex min-h-0 flex-col xl:flex-row min-w-0 ${
                customerId ? 'flex' : 'hidden lg:flex'
              }`}
            >
            <section className="w-full xl:w-[42%] shrink-0 flex flex-col min-h-0 bg-white border-b xl:border-b-0 xl:border-r border-slate-200 p-3 md:p-4">
              <div className="shrink-0 flex items-center justify-between gap-2 mb-3">
                <div className="min-w-0 flex items-center gap-2">
                  {customerId && (
                    <Link
                      to={ROUTES.expert.doctorDesk}
                      className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"
                      aria-label="Quay lại danh sách"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Link>
                  )}
                  <h1 className="text-sm font-semibold text-slate-800 m-0 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-teal-600 shrink-0" />
                    Chat trực tiếp
                  </h1>
                </div>
                <Link to={ROUTES.expert.customers.root} className="text-xs font-medium text-teal-700 hover:text-teal-800 shrink-0">
                  Gán KH
                </Link>
              </div>

              {!customerId ? (
                <div className="flex-1 flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
                  <p className="text-sm text-slate-500 m-0">Chọn khách hàng bên trái để bắt đầu trò chuyện.</p>
                </div>
              ) : (
                <LiveChatPanel
                  className="flex-1 min-h-0"
                  messages={live.messages}
                  loading={live.loading}
                  ready={live.ready && liveMode}
                  sending={live.sending}
                  sendError={live.sendError}
                  draft={draft}
                  onDraftChange={setDraft}
                  onSend={sendDoctor}
                  viewer="expert"
                  myUserId={user?.id}
                  placeholder="Nhắn cho khách hàng…"
                  header={{
                    peerName: customerLabel,
                    peerEmail: detail?.customer.email,
                    transportLabel: live.transportLabel,
                    onRefresh: live.refresh,
                  }}
                  toolbar={
                    detail && detail.botMessages.length > 0 ? (
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowAiContext((v) => !v)}
                          className="w-full text-left text-xs font-medium px-3 py-2 rounded-xl border inline-flex items-center gap-2 hover:opacity-90"
                          style={{ borderColor: tezcaTheme.border, backgroundColor: tezcaTheme.surface, color: tezcaTheme.textMuted }}
                        >
                          <Bot className="w-3.5 h-3.5" />
                          {showAiContext ? 'Ẩn' : 'Xem'} ngữ cảnh Tezca AI ({detail.botMessages.length})
                        </button>
                        {showAiContext && (
                          <div
                            className="mt-2 max-h-32 overflow-y-auto rounded-xl border p-2 space-y-2"
                            style={{ borderColor: tezcaTheme.border, backgroundColor: tezcaTheme.subtleBg }}
                          >
                            {detail.botMessages.slice(-6).map((b) => (
                              <p key={b.id} className="text-[11px] m-0 leading-snug" style={{ color: tezcaTheme.textMuted }}>
                                <span className="font-semibold">{b.role === 'assistant' ? 'AI' : 'KH'}:</span>{' '}
                                {b.content.length > 120 ? `${b.content.slice(0, 120)}…` : b.content}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null
                  }
                  emptyTitle="Chưa có tin nhắn"
                  emptyHint="Gửi lời nhắn hoặc chọn mẫu trả lời nhanh."
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
                  onQuickReply={quickReply}
                />
              )}
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
                <h2 className="text-sm font-semibold text-slate-800 m-0 mb-3">Emotion Heatmap</h2>
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
              </div>

              <div className="rounded-xl bg-white border border-slate-200/80 shadow-sm p-4 md:p-5">
                <h2 className="text-sm font-semibold text-slate-800 m-0 mb-3">Hồ sơ bệnh lý</h2>
                {detail?.healthProfile ? (
                  <div className="space-y-2 text-sm text-slate-700">
                    <p className="m-0"><strong>Tình trạng hiện tại:</strong> {detail.healthProfile.currentConditions || 'Chưa cập nhật'}</p>
                    <p className="m-0"><strong>Tiền sử:</strong> {detail.healthProfile.medicalHistory || 'Chưa cập nhật'}</p>
                    <p className="m-0"><strong>Dị ứng:</strong> {detail.healthProfile.allergies || 'Chưa cập nhật'}</p>
                    <p className="m-0"><strong>Thuốc:</strong> {detail.healthProfile.medications || 'Chưa cập nhật'}</p>
                    <p className="m-0"><strong>Chống chỉ định:</strong> {detail.healthProfile.contraindications || 'Chưa cập nhật'}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 m-0">Khách hàng chưa cập nhật hồ sơ bệnh lý.</p>
                )}
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
