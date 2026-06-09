import { useEffect, useState } from 'react';
import { MessageCircle, Shield, UserCheck } from 'lucide-react';
import { useLiveChat } from '../../lib/liveChat';
import { useCustomerSession } from '../../lib/customerSessionGate';
import { LiveChatPanel } from '../../components/LiveChatPanel';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';
import { apiFetch } from '../../lib/api';
import { EmptyState } from '../../components/tezca/EmptyState';
import { ROUTES } from '../../routes';

type CareTeamExpert = {
  id: string;
  email: string;
  name?: string;
  fullName?: string;
};

type ExpertRequest = {
  id: string;
  expertId: string;
  status: 'requested' | 'accepted' | 'rejected' | 'revoked';
  expertName?: string;
  expertEmail?: string;
};

export function CustomerExpertChatPage() {
  const { token, user } = useCustomerSession();
  const [draft, setDraft] = useState('');
  const [careTeam, setCareTeam] = useState<{ experts: CareTeamExpert[]; primary: CareTeamExpert | null }>({
    experts: [],
    primary: null,
  });
  const [requests, setRequests] = useState<ExpertRequest[]>([]);
  const [careLoading, setCareLoading] = useState(true);
  const [careError, setCareError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const customerId = user?.id;
  const primaryExpert = careTeam.primary;
  const pendingRequest = requests.find((r) => r.status === 'requested');
  const peerName = primaryExpert?.fullName || primaryExpert?.name || 'Chuyên gia Tezca';

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setCareTeam({ experts: [], primary: null });
      setRequests([]);
      setCareLoading(false);
      setCareError('');
      return () => {
        cancelled = true;
      };
    }

    setCareLoading(true);
    setCareError('');
    Promise.all([
      apiFetch<{ experts: CareTeamExpert[]; primary: CareTeamExpert | null }>('/api/me/care-team', { token }),
      apiFetch<{ requests: ExpertRequest[] }>('/api/me/experts/requests', { token }),
    ])
      .then(([teamRes, requestsRes]) => {
        if (cancelled) return;
        setCareTeam({ experts: teamRes.experts || [], primary: teamRes.primary || null });
        setRequests(requestsRes.requests || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setCareTeam({ experts: [], primary: null });
        setRequests([]);
        setCareError(err instanceof Error ? err.message : 'Không kiểm tra được chuyên gia đồng hành');
      })
      .finally(() => {
        if (!cancelled) setCareLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  const live = useLiveChat({
    token,
    customerId,
    historyUrl: '/api/me/live-messages',
    sendUrl: '/api/me/live-messages',
    senderRole: 'customer',
    enabled: Boolean(token && customerId && primaryExpert && !careLoading),
  });

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !live.ready) return;
    const ok = await live.send(text);
    if (ok) setDraft('');
  };

  return (
    <div
      className="-mx-6 -mt-6 md:-mx-10 md:-mt-10 flex flex-col"
      style={{
        backgroundColor: tezcaTheme.bg,
        color: tezcaTheme.text,
        minHeight: 'calc(100vh - 4rem)',
      }}
    >
      <div className="max-w-2xl mx-auto w-full flex flex-col flex-1 p-4 md:p-8 min-h-0">
        <header className="shrink-0 mb-4">
          <div className="flex items-start gap-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: tezcaTheme.accentGradient, color: '#fff' }}
            >
              <MessageCircle size={22} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold m-0" style={{ color: tezcaTheme.text }}>
                Chat chuyên gia
              </h1>
              <p className="text-sm mt-1 m-0 leading-relaxed" style={{ color: tezcaTheme.textMuted }}>
                Trao đổi trực tiếp với chuyên gia được gán — tin nhắn được lưu an toàn trên hệ thống.
              </p>
            </div>
          </div>
          <p
            className="text-xs mt-3 m-0 flex items-center gap-1.5 rounded-xl px-3 py-2 border"
            style={{ ...tezcaCardStyle, color: tezcaTheme.textMuted }}
          >
            <Shield className="w-3.5 h-3.5 shrink-0" style={{ color: tezcaTheme.accentDark }} />
            Không thay thế cấp cứu y tế. Nếu khẩn cấp, hãy gọi 115.
          </p>
        </header>

        <div className="rounded-2xl border p-4 md:p-5 flex flex-col flex-1 min-h-0" style={tezcaCardStyle}>
          {careLoading && (
            <p className="text-sm text-center py-12 m-0" style={{ color: tezcaTheme.textMuted }}>
              Đang kiểm tra chuyên gia đồng hành…
            </p>
          )}

          {!careLoading && careError && (
            <EmptyState
              icon={UserCheck}
              title="Không kiểm tra được chuyên gia"
              description={careError}
              actionLabel="Thử lại"
              onAction={() => setReloadKey((n) => n + 1)}
            />
          )}

          {!careLoading && !careError && !primaryExpert && (
            <EmptyState
              icon={UserCheck}
              title={pendingRequest ? 'Đang chờ chuyên gia duyệt' : 'Chưa có chuyên gia đồng hành'}
              description={
                pendingRequest
                  ? `Yêu cầu gửi tới ${pendingRequest.expertName || 'chuyên gia'} đang chờ xác nhận. Chat sẽ mở sau khi chuyên gia duyệt.`
                  : 'Bạn cần chọn chuyên gia và được duyệt trước khi dùng chat chuyên gia.'
              }
              actionLabel={pendingRequest ? 'Xem yêu cầu' : 'Chọn chuyên gia'}
              actionTo={ROUTES.app.chooseExpert}
            />
          )}

          {!careLoading && !careError && primaryExpert && (
            <LiveChatPanel
              className="flex-1 min-h-0"
              messages={live.messages}
              loading={live.loading}
              ready={live.ready}
              sending={live.sending}
              sendError={live.sendError}
              draft={draft}
              onDraftChange={setDraft}
              onSend={handleSend}
              viewer="customer"
              placeholder={`Nhắn cho ${peerName}…`}
              header={{
                title: 'Chuyên gia đồng hành',
                peerName,
                peerEmail: primaryExpert.email,
                transportLabel: live.transportLabel,
                onRefresh: live.refresh,
              }}
              emptyTitle="Bắt đầu cuộc trò chuyện"
              emptyHint="Hỏi về kế hoạch tập, dinh dưỡng hoặc tâm trạng — chuyên gia sẽ phản hồi sớm."
            />
          )}
        </div>
      </div>
    </div>
  );
}
