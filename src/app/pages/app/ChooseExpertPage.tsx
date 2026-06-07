import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ChevronRight, Filter, ShieldPlus, UserCheck, FileUser } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';
import { EmptyState } from '../../components/tezca/EmptyState';
import {
  EXPERT_SPECIALTY_TYPES,
  expertSpecialtyIcon,
  expertSpecialtyLabel,
  type ExpertSpecialtyType,
} from '../../lib/communityTopics';
import { isCustomerProfileComplete, type CustomerBasicProfile } from '../../components/CustomerProfileForm';
import { ROUTES } from '../../routes';

type ExpertRow = {
  id: string;
  email: string;
  fullName?: string;
  name?: string;
  specialty?: string;
  bio?: string;
  licenseNo?: string;
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
  const [myProfile, setMyProfile] = useState<CustomerBasicProfile | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState<ExpertSpecialtyType | ''>('');

  const profileComplete = isCustomerProfileComplete(myProfile);

  const requestByExpertId = useMemo(() => {
    const map = new Map<string, ExpertRequestRow>();
    for (const r of requests) map.set(r.expertId, r);
    return map;
  }, [requests]);

  const filteredExperts = useMemo(() => {
    if (!specialtyFilter) return experts;
    return experts.filter((e) => e.specialty === specialtyFilter);
  }, [experts, specialtyFilter]);

  const loadData = () => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      apiFetch<{ experts: ExpertRow[] }>('/api/me/experts', { token }),
      apiFetch<{ requests: ExpertRequestRow[] }>('/api/me/experts/requests', { token }),
      apiFetch<{ profile: CustomerBasicProfile }>('/api/me/profile', { token }),
    ])
      .then(([expertsRes, requestsRes, profileRes]) => {
        setExperts(expertsRes.experts);
        setRequests(requestsRes.requests);
        setMyProfile(profileRes.profile);
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
    if (!profileComplete) {
      setMessage('Vui lòng hoàn thiện hồ sơ cá nhân trước khi gửi yêu cầu.');
      return;
    }
    const existing = requestByExpertId.get(expertId);
    if (existing?.status === 'requested' || existing?.status === 'accepted') return;

    setBusyId(expertId);
    setMessage('');
    try {
      await apiFetch(`/api/me/experts/${encodeURIComponent(expertId)}/request`, {
        method: 'POST',
        token,
      });
      setMessage('Đã gửi yêu cầu cùng hồ sơ của bạn. Chờ chuyên gia xác nhận.');
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
          Xem hồ sơ tóm tắt của chuyên gia Tezca và gửi yêu cầu đồng hành kèm hồ sơ sức khỏe của bạn.
        </p>
      </div>

      {!profileComplete && !loading && (
        <div
          className="rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3"
          style={{ ...tezcaCardStyle, borderColor: 'rgba(251, 191, 36, 0.4)', backgroundColor: 'rgba(251, 191, 36, 0.08)' }}
        >
          <FileUser size={22} className="shrink-0" style={{ color: '#b45309' }} aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="m-0 text-sm font-semibold" style={{ color: tezcaTheme.text }}>
              Hoàn thiện hồ sơ trước khi chọn chuyên gia
            </p>
            <p className="m-0 text-xs mt-1 opacity-80" style={{ color: tezcaTheme.textMuted }}>
              Thông tin cá nhân và sức khỏe sẽ được gửi tới chuyên gia khi bạn yêu cầu đồng hành.
            </p>
          </div>
          <Link
            to={ROUTES.app.profile}
            className="shrink-0 text-sm font-semibold rounded-xl px-4 py-2.5 no-underline text-center"
            style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
          >
            Mở hồ sơ
          </Link>
        </div>
      )}

      {message && (
        <p
          className="text-sm m-0 rounded-xl px-4 py-3 border"
          style={{
            ...tezcaCardStyle,
            color: message.includes('Không') || message.includes('hoàn thiện') ? '#b45309' : tezcaTheme.accentDark,
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
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-semibold m-0 flex items-center gap-2" style={{ color: tezcaTheme.text }}>
            <ShieldPlus size={20} style={{ color: tezcaTheme.accentDark }} aria-hidden />
            Danh sách chuyên gia
            {!loading && (
              <span className="text-sm font-normal opacity-50">
                ({filteredExperts.length}{specialtyFilter ? ` / ${experts.length}` : ''})
              </span>
            )}
          </h2>
          <Link
            to={ROUTES.app.profile}
            className="text-xs font-semibold no-underline opacity-80 hover:opacity-100"
            style={{ color: tezcaTheme.accentDark }}
          >
            Chỉnh hồ sơ gửi CG →
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium opacity-60 flex items-center gap-1" style={{ color: tezcaTheme.text }}>
            <Filter size={13} aria-hidden />
            Lọc theo loại:
          </span>
          <button
            type="button"
            onClick={() => setSpecialtyFilter('')}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border-0 cursor-pointer"
            style={{
              background: !specialtyFilter ? tezcaTheme.accentGradient : tezcaTheme.subtleBg,
              color: tezcaTheme.text,
            }}
          >
            Tất cả
          </button>
          {EXPERT_SPECIALTY_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => setSpecialtyFilter(specialtyFilter === type.id ? '' : type.id)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border-0 cursor-pointer"
              style={{
                background: specialtyFilter === type.id ? tezcaTheme.accentGradient : tezcaTheme.subtleBg,
                color: tezcaTheme.text,
              }}
            >
              {type.icon} {type.label}
            </button>
          ))}
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

        {!loading && experts.length > 0 && filteredExperts.length === 0 && (
          <div
            className="rounded-2xl border p-6 text-center text-sm opacity-70"
            style={{ ...tezcaCardStyle, color: tezcaTheme.text }}
          >
            Không có chuyên gia nào thuộc loại này. Thử chọn loại khác.
          </div>
        )}

        {!loading && filteredExperts.length > 0 && (
          <ul className="space-y-2 list-none m-0 p-0">
            {filteredExperts.map((e) => {
              const displayName = e.fullName || e.name || 'Chuyên gia Tezca';
              const req = requestByExpertId.get(e.id);
              const badge = statusLabel(req?.status);
              const canRequest =
                profileComplete && (!req || req.status === 'rejected' || req.status === 'revoked');
              const specIcon = expertSpecialtyIcon(e.specialty);
              const specLabel = expertSpecialtyLabel(e.specialty);

              return (
                <li
                  key={e.id}
                  className="rounded-2xl border overflow-hidden"
                  style={{ ...tezcaCardStyle }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4 p-4 md:p-5">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                      style={{ background: tezcaTheme.accentGradient }}
                      aria-hidden
                    >
                      {specIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="m-0 font-semibold text-lg" style={{ color: tezcaTheme.text }}>
                        {displayName}
                      </p>
                      <span
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full mt-1"
                        style={{ backgroundColor: 'rgba(45, 212, 191, 0.15)', color: tezcaTheme.accentDark }}
                      >
                        {specLabel}
                      </span>
                      {e.licenseNo?.trim() && (
                        <p className="m-0 text-xs mt-2 opacity-60" style={{ color: tezcaTheme.textMuted }}>
                          Mã / chứng chỉ: {e.licenseNo}
                        </p>
                      )}
                      {e.bio?.trim() ? (
                        <p
                          className="m-0 text-sm mt-3 leading-relaxed whitespace-pre-wrap"
                          style={{ color: tezcaTheme.textMuted }}
                        >
                          {e.bio}
                        </p>
                      ) : (
                        <p className="m-0 text-xs mt-2 italic opacity-50" style={{ color: tezcaTheme.textMuted }}>
                          Chuyên gia chưa cập nhật giới thiệu.
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0 sm:min-w-[148px]">
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
                        title={!profileComplete ? 'Hoàn thiện hồ sơ trước' : undefined}
                      >
                        {busyId === e.id
                          ? 'Đang gửi…'
                          : !profileComplete
                            ? 'Cần hồ sơ'
                            : canRequest
                              ? 'Chọn & gửi hồ sơ'
                              : 'Đã gửi yêu cầu'}
                        {canRequest && profileComplete && <ChevronRight size={16} aria-hidden />}
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
