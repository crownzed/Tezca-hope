import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { GraduationCap, Link2, MessageSquare, Users } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { FormAlert } from '../../components/tezca/FormAlert';
import { ROUTES } from '../../routes';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';

type CustomerRow = { id: string; email: string; fullName?: string; name?: string };
type ExpertRow = { id: string; email: string; fullName?: string; specialty?: string; name?: string };
type AssignmentRow = {
  id: string;
  expertId: string;
  customerId: string;
  status: string;
  requestedBy: string;
  expertName?: string;
  customerName?: string;
};
type CommunityPostRow = {
  id: string;
  authorName: string;
  topic: string;
  content: string;
  status: string;
  likesCount: number;
  createdAt: number;
};
type CommunityReportRow = {
  id: string;
  targetType: string;
  targetId: string;
  reporterName: string;
  reason: string;
  status: string;
  createdAt: number;
};

function StatCard({
  label,
  value,
  icon: Icon,
  linkTo,
  accent,
}: {
  label: string;
  value: number;
  icon: typeof GraduationCap;
  linkTo?: string;
  accent?: boolean;
}) {
  const inner = (
    <div
      className="rounded-xl border p-4 flex items-center gap-4 transition-colors"
      style={{
        ...tezcaCardStyle,
        ...(accent ? { borderColor: tezcaTheme.accentLight } : {}),
      }}
    >
      <span
        className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: tezcaTheme.accentGradient }}
      >
        <Icon size={20} style={{ color: '#fff' }} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold m-0 leading-none">{value}</p>
        <p className="text-xs mt-1 m-0 opacity-70 leading-tight">{label}</p>
      </div>
    </div>
  );
  return linkTo ? (
    <Link to={linkTo} className="no-underline block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function AdminDashboardPage() {
  const { token } = useAdminAuth();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [experts, setExperts] = useState<ExpertRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPostRow[]>([]);
  const [communityReports, setCommunityReports] = useState<CommunityReportRow[]>([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [assignmentForm, setAssignmentForm] = useState({ expertId: '', customerId: '' });
  const [assignmentBusy, setAssignmentBusy] = useState(false);
  const [removingAssId, setRemovingAssId] = useState<string | null>(null);
  const [moderationBusy, setModerationBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token) return;
    Promise.all([
      apiFetch<{ customers: CustomerRow[] }>('/api/admin/customers', { token }),
      apiFetch<{ experts: ExpertRow[] }>('/api/admin/experts', { token }),
      apiFetch<{ assignments: AssignmentRow[] }>('/api/admin/assignments', { token }),
      apiFetch<{ posts: CommunityPostRow[] }>('/api/admin/community/posts', { token }),
      apiFetch<{ reports: CommunityReportRow[] }>('/api/admin/community/reports', { token }),
    ])
      .then(([c, e, a, p, r]) => {
        setCustomers(c.customers);
        setExperts(e.experts);
        setAssignments(a.assignments);
        setCommunityPosts(p.posts);
        setCommunityReports(r.reports);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được dữ liệu quản trị'));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const assign = async () => {
    if (!token || !assignmentForm.expertId || !assignmentForm.customerId) return;
    setAssignmentBusy(true);
    try {
      await apiFetch('/api/admin/assignments', {
        method: 'POST',
        token,
        body: JSON.stringify(assignmentForm),
      });
      setAssignmentForm({ expertId: '', customerId: '' });
      setToast('Đã gán chuyên gia cho khách hàng.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không gán được');
    } finally {
      setAssignmentBusy(false);
    }
  };

  const removeAssignment = async (a: AssignmentRow) => {
    if (!token) return;
    if (
      !window.confirm(
        `Gỡ quan hệ "${a.expertName || 'Expert'} ↔ ${a.customerName || 'Khách hàng'}"?`,
      )
    )
      return;
    setRemovingAssId(a.id);
    try {
      await apiFetch('/api/admin/assignments', {
        method: 'DELETE',
        token,
        body: JSON.stringify({ expertId: a.expertId, customerId: a.customerId }),
      });
      setToast('Đã gỡ quan hệ gán.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không gỡ được');
    } finally {
      setRemovingAssId(null);
    }
  };

  const pendingReports = communityReports.filter((r) => r.status === 'pending');

  const moderatePost = async (postId: string, status: 'hidden') => {
    if (!token) return;
    setModerationBusy(postId);
    try {
      await apiFetch(`/api/admin/community/posts/${encodeURIComponent(postId)}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status }),
      });
      setToast('Đã ẩn bài viết.');
      load();
    } finally {
      setModerationBusy(null);
    }
  };

  const resolveReport = async (report: CommunityReportRow, action: 'hide' | 'dismiss') => {
    if (!token) return;
    setModerationBusy(report.id);
    try {
      if (action === 'hide' && report.targetType === 'post') {
        await moderatePost(report.targetId, 'hidden');
      }
      await apiFetch(`/api/admin/community/reports/${encodeURIComponent(report.id)}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ status: action === 'hide' ? 'resolved' : 'dismissed' }),
      });
      setToast(action === 'hide' ? 'Đã ẩn nội dung và đóng báo cáo.' : 'Đã bỏ qua báo cáo.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xử lý được báo cáo');
    } finally {
      setModerationBusy(null);
    }
  };

  const selectStyle = {
    borderColor: tezcaTheme.borderStrong,
    color: tezcaTheme.text,
    backgroundColor: tezcaTheme.inputBg,
  };

  return (
    <div className="space-y-8" style={{ color: tezcaTheme.text }}>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold m-0">Tổng quan hệ thống</h1>
        <p className="text-sm mt-1.5 m-0 opacity-70">
          Gán chuyên gia – khách hàng và kiểm duyệt cộng đồng. Quản lý tài khoản tại{' '}
          <Link to={ROUTES.admin.experts} className="text-teal-600 underline">
            Chuyên gia
          </Link>{' '}
          và{' '}
          <Link to={ROUTES.admin.customers} className="text-teal-600 underline">
            Khách hàng
          </Link>
          .
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Chuyên gia" value={experts.length} icon={GraduationCap} linkTo={ROUTES.admin.experts} />
        <StatCard label="Khách hàng" value={customers.length} icon={Users} linkTo={ROUTES.admin.customers} />
        <StatCard label="Quan hệ gán" value={assignments.length} icon={Link2} />
        <StatCard
          label="Báo cáo chờ xử lý"
          value={pendingReports.length}
          icon={MessageSquare}
          accent={pendingReports.length > 0}
        />
      </div>

      {error && <FormAlert variant="error">{error}</FormAlert>}
      {toast && <FormAlert variant="success">{toast}</FormAlert>}

      {/* Assignment section */}
      <section className="rounded-2xl border p-5 space-y-4" style={tezcaCardStyle}>
        <div>
          <h2 className="text-lg font-semibold m-0">Gán chuyên gia – khách hàng</h2>
          <p className="text-sm opacity-70 m-0 mt-1">Chọn cặp và nhấn "Gán" để tạo quan hệ mới.</p>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="font-medium">Chuyên gia</span>
            <select
              value={assignmentForm.expertId}
              onChange={(e) => setAssignmentForm((s) => ({ ...s, expertId: e.target.value }))}
              className="mt-1.5 w-full border rounded-xl px-3 py-2.5 text-sm"
              style={selectStyle}
            >
              <option value="">Chọn chuyên gia…</option>
              {experts.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fullName || e.name || e.email}
                  {e.specialty ? ` · ${e.specialty}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium">Khách hàng</span>
            <select
              value={assignmentForm.customerId}
              onChange={(e) => setAssignmentForm((s) => ({ ...s, customerId: e.target.value }))}
              className="mt-1.5 w-full border rounded-xl px-3 py-2.5 text-sm"
              style={selectStyle}
            >
              <option value="">Chọn khách hàng…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName || c.name || c.email}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button
          type="button"
          onClick={() => void assign()}
          disabled={assignmentBusy || !assignmentForm.expertId || !assignmentForm.customerId}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
        >
          {assignmentBusy ? 'Đang gán…' : 'Gán'}
        </button>

        {/* Existing assignments table */}
        {assignments.length > 0 && (
          <div className="pt-2">
            <h3 className="text-sm font-semibold mb-2 m-0">Quan hệ hiện tại ({assignments.length})</h3>
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: tezcaTheme.border }}>
              <table className="w-full text-left border-collapse min-w-[480px] text-sm">
                <thead>
                  <tr style={{ backgroundColor: tezcaTheme.subtleBg }}>
                    <th className="p-2.5 border-b font-semibold" style={{ borderColor: tezcaTheme.border }}>
                      Chuyên gia
                    </th>
                    <th className="p-2.5 border-b font-semibold" style={{ borderColor: tezcaTheme.border }}>
                      Khách hàng
                    </th>
                    <th className="p-2.5 border-b font-semibold" style={{ borderColor: tezcaTheme.border }}>
                      Trạng thái
                    </th>
                    <th className="p-2.5 border-b font-semibold text-center" style={{ borderColor: tezcaTheme.border }}>
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-2.5 border-b font-medium" style={{ borderColor: tezcaTheme.border }}>
                        {a.expertName || '—'}
                      </td>
                      <td className="p-2.5 border-b" style={{ borderColor: tezcaTheme.border }}>
                        {a.customerName || '—'}
                      </td>
                      <td className="p-2.5 border-b" style={{ borderColor: tezcaTheme.border }}>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            a.status === 'accepted'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {a.status === 'accepted' ? 'Đã xác nhận' : a.status}
                        </span>
                      </td>
                      <td className="p-2.5 border-b text-center" style={{ borderColor: tezcaTheme.border }}>
                        <button
                          type="button"
                          disabled={removingAssId === a.id}
                          onClick={() => void removeAssignment(a)}
                          className="text-red-600 hover:underline text-xs font-medium border-0 bg-transparent cursor-pointer disabled:opacity-50 p-0"
                        >
                          Gỡ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Community moderation */}
      <section className="rounded-2xl border p-5 space-y-5" style={tezcaCardStyle}>
        <div>
          <h2 className="text-lg font-semibold m-0">Kiểm duyệt cộng đồng</h2>
          <p className="text-sm opacity-70 m-0 mt-1">Báo cáo chờ xử lý và bài viết gần đây.</p>
        </div>

        {/* Pending reports */}
        <div>
          <h3 className="text-sm font-semibold m-0 mb-2">
            Báo cáo chờ xử lý
            {pendingReports.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
                {pendingReports.length}
              </span>
            )}
          </h3>
          {pendingReports.length === 0 ? (
            <p className="text-sm opacity-60 m-0 italic">Không có báo cáo chờ xử lý.</p>
          ) : (
            <ul className="space-y-2 list-none m-0 p-0">
              {pendingReports.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border p-3 text-sm"
                  style={{ borderColor: tezcaTheme.border, backgroundColor: tezcaTheme.subtleBg }}
                >
                  <p className="m-0 mb-1.5">
                    <strong>{r.reporterName}</strong> báo cáo{' '}
                    <span className="font-medium opacity-80">{r.targetType}</span>
                    {r.reason ? ` · ${r.reason}` : ''}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={moderationBusy === r.id}
                      className="px-3 py-1 rounded-lg text-xs font-semibold border-0 cursor-pointer disabled:opacity-50"
                      style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
                      onClick={() => void resolveReport(r, 'hide')}
                    >
                      Ẩn nội dung & đóng
                    </button>
                    <button
                      type="button"
                      disabled={moderationBusy === r.id}
                      className="px-3 py-1 rounded-lg text-xs font-medium border cursor-pointer disabled:opacity-50"
                      style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.text, backgroundColor: 'transparent' }}
                      onClick={() => void resolveReport(r, 'dismiss')}
                    >
                      Bỏ qua
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent posts */}
        <div>
          <h3 className="text-sm font-semibold m-0 mb-2">Bài viết gần đây ({communityPosts.length})</h3>
          {communityPosts.length === 0 ? (
            <p className="text-sm opacity-60 m-0 italic">Chưa có bài viết.</p>
          ) : (
            <ul className="space-y-2 list-none m-0 p-0 max-h-72 overflow-y-auto">
              {communityPosts.slice(0, 20).map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl border p-3 text-sm"
                  style={{ borderColor: tezcaTheme.border }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-medium">{p.authorName}</span>
                      <span className="opacity-60 mx-1.5">·</span>
                      <span className="opacity-70 text-xs">{p.topic}</span>
                      <span className="opacity-60 mx-1.5">·</span>
                      <span
                        className={`text-xs font-medium ${
                          p.status === 'published' ? 'text-emerald-600' : 'text-slate-500'
                        }`}
                      >
                        {p.status === 'published' ? 'Hiển thị' : 'Đã ẩn'}
                      </span>
                      <p className="m-0 mt-1 line-clamp-2 opacity-80 leading-snug">{p.content}</p>
                    </div>
                    {p.status === 'published' && (
                      <button
                        type="button"
                        disabled={moderationBusy === p.id}
                        className="shrink-0 text-xs px-2.5 py-1 rounded-lg border cursor-pointer disabled:opacity-50"
                        style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.text, backgroundColor: 'transparent' }}
                        onClick={() => void moderatePost(p.id, 'hidden')}
                      >
                        Ẩn
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
