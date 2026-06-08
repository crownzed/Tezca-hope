import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, ShieldPlus, UserCheck } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';
import { EmptyState } from '../../components/tezca/EmptyState';

type ExpertRow = {
  id: string;
  email: string;
  fullName?: string;
  name?: string;
  specialty?: string;
  bio?: string;
};

type ExpertRequestRow = {
  id: string;
  expertId: string;
  status: 'requested' | 'accepted' | 'rejected' | 'revoked';
  expertName?: string;
  expertEmail?: string;
};

function statusLabel(status: ExpertRequestRow['status'] | undefined) {
  if (!status) return null;
  if (status === 'requested') return { text: 'Đang chờ duyệt', tone: 'pending' as const };
  if (status === 'accepted') return { text: 'Đã đồng hành', tone: 'ok' as const };
  if (status === 'rejected') return { text: 'Đã từ chối', tone: 'bad' as const };
  return { text: 'Đã thu hồi', tone: 'muted' as const };
}

export function ChooseExpertPage() {
  const { token } = useCustomerAuth();
  const [experts, setExperts] = useState<ExpertRow[]>([]);
  const [requests, setRequests] = useState<ExpertRequestRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const requestByExpertId = useMemo(() => {
    const map = new Map<string, ExpertRequestRow>();
    for (const r of requests) map.set(r.expertId, r);
    return map;
  }, [requests]);

  const loadData = () => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiFetch<{ experts: ExpertRow[] }>('/api/me/experts', { token }),
      apiFetch<{ requests: ExpertRequestRow[] }>('/api/me/experts/requests', { token }),
    ])
      .then(([expertsRes, requestsRes]) => {
        setExperts(expertsRes.experts);
        setRequests(requestsRes.requests);
        setMessage('');
      })
      .catch(() => setMessage('Không tải được danh sách chuyên gia'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const requestExpert = async (expertId: string) => {
    if (!token) return;
    const existing = requestByExpertId.get(expertId);
    if (existing?.status === 'requested' || existing?.status === 'accepted') return;

    setBusyId(expertId);
    setMessage('');
    try {
      await apiFetch(`/api/me/experts/${encodeURIComponent(expertId)}/request`, {
        method: 'POST',
        token,
      });
      setMessage('Đã gửi yêu cầu chọn chuyên gia. Chờ chuyên gia xác nhận.');
      loadData();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Không gửi được yêu cầu');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold m-0" style={{ color: tezcaTheme.text }}>
          Chọn chuyên gia đồng hành
        </h1>
        <p className="text-sm opacity-70 mt-2 m-0 leading-relaxed" style={{ color: tezcaTheme.text }}>
          Xem danh sách chuyên gia Tezca và gửi yêu cầu đồng hành. Chuyên gia duyệt trước khi mở quyền theo dõi và tư
          vấn.
        </p>
      </div>

      {message && (
        <p
          className="text-sm m-0 rounded-xl px-4 py-3 border"
          style={{
            ...tezcaCardStyle,
            color: message.includes('Không') ? '#b45309' : tezcaTheme.accentDark,
          }}
        >
          {message}
        </p>
      )}

      {requests.length > 0 && (
        <section className="rounded-2xl border p-5 space-y-3" style={tezcaCardStyle}>
          <h2 className="text-lg font-semibold m-0">Yêu cầu đã gửi</h2>
          <ul className="space-y-2 list-none m-0 p-0">
            {requests.map((r) => {
              const badge = statusLabel(r.status);
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 border text-sm"
                  style={{ borderColor: tezcaTheme.border, backgroundColor: tezcaTheme.subtleBg }}
                >
                  <span style={{ color: tezcaTheme.text }}>
                    <strong>{r.expertName || 'Chuyên gia'}</strong>
                    {r.expertEmail ? (
                      <span className="opacity-60"> · {r.expertEmail}</span>
                    ) : null}
                  </span>
                  {badge && (
                    <span
                      className="text-xs px-2.5 py-1 rounded-full shrink-0 font-medium"
                      style={{
                        backgroundColor:
                          badge.tone === 'ok'
                            ? 'rgba(45, 212, 191, 0.2)'
                            : badge.tone === 'pending'
                              ? 'rgba(251, 191, 36, 0.2)'
                              : 'rgba(26, 32, 44, 0.06)',
                        color: tezcaTheme.text,
                      }}
                    >
                      {badge.text}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold m-0 flex items-center gap-2" style={{ color: tezcaTheme.text }}>
            <ShieldPlus size={20} style={{ color: tezcaTheme.accentDark }} aria-hidden />
            Danh sách chuyên gia
            {!loading && (
              <span className="text-sm font-normal opacity-50">({experts.length})</span>
            )}
          </h2>
        </div>

        {loading && (
          <p className="text-sm opacity-60 m-0" style={{ color: tezcaTheme.text }}>
            Đang tải danh sách chuyên gia…
          </p>
        )}

        {!loading && experts.length === 0 && (
          <EmptyState
            icon={UserCheck}
            title="Chưa có chuyên gia"
            description="Hệ thống chưa có chuyên gia khả dụng. Vui lòng thử lại sau hoặc liên hệ hỗ trợ Tezca."
            actionLabel="Tải lại"
            onAction={loadData}
          />
        )}

        {!loading && experts.length > 0 && (
          <ul className="space-y-2 list-none m-0 p-0">
            {experts.map((e) => {
              const displayName = e.fullName || e.name || 'Chuyên gia Tezca';
              const req = requestByExpertId.get(e.id);
              const badge = statusLabel(req?.status);
              const canRequest = !req || req.status === 'rejected' || req.status === 'revoked';

              return (
                <li
                  key={e.id}
                  className="rounded-2xl border overflow-hidden"
                  style={{ ...tezcaCardStyle }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 md:p-5">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
                      style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
                      aria-hidden
                    >
                      {displayName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="m-0 font-semibold" style={{ color: tezcaTheme.text }}>
                        {displayName}
                      </p>
                      <p className="m-0 text-sm mt-0.5" style={{ color: tezcaTheme.accentDark }}>
                        {e.specialty || 'Tư vấn sức khỏe tổng quát'}
                      </p>
                      <p className="m-0 text-xs mt-1 opacity-60 truncate" style={{ color: tezcaTheme.text }}>
                        {e.email}
                      </p>
                      {e.bio && (
                        <p className="m-0 text-sm mt-2 opacity-80 line-clamp-2" style={{ color: tezcaTheme.textMuted }}>
                          {e.bio}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
                      {badge && (
                        <span
                          className="text-xs px-2.5 py-1 rounded-full text-center font-medium"
                          style={{
                            backgroundColor:
                              badge.tone === 'ok'
                                ? 'rgba(45, 212, 191, 0.2)'
                                : badge.tone === 'pending'
                                  ? 'rgba(251, 191, 36, 0.2)'
                                  : 'rgba(26, 32, 44, 0.06)',
                          }}
                        >
                          {badge.text}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => void requestExpert(e.id)}
                        disabled={busyId === e.id || !canRequest}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: canRequest ? tezcaTheme.accentGradient : tezcaTheme.subtleBg,
                          color: tezcaTheme.text,
                        }}
                      >
                        {busyId === e.id
                          ? 'Đang gửi…'
                          : canRequest
                            ? 'Chọn chuyên gia này'
                            : 'Đã gửi yêu cầu'}
                        {canRequest && <ChevronRight size={16} aria-hidden />}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
