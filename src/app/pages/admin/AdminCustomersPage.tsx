import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Search, UserPlus, Users } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { FormAlert } from '../../components/tezca/FormAlert';
import { EmptyState } from '../../components/tezca/EmptyState';
import { ROUTES } from '../../routes';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';

type CustomerRow = { id: string; email: string; fullName?: string; name?: string };

export function AdminCustomersPage() {
  const { token } = useAdminAuth();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiFetch<{ customers: CustomerRow[] }>('/api/admin/customers', { token })
      .then((r) => {
        setCustomers(r.customers);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được danh sách khách hàng'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(''), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  const promoteToExpert = async (customer: CustomerRow) => {
    if (!token) return;
    if (
      !window.confirm(
        `Nâng "${customer.fullName || customer.name || customer.email}" lên quyền Chuyên gia?\nTài khoản sẽ chuyển sang hệ chuyên gia và không còn đăng nhập như khách hàng.`,
      )
    )
      return;
    setBusyId(customer.id);
    try {
      await apiFetch(`/api/admin/users/${encodeURIComponent(customer.id)}/role`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ role: 'expert' }),
      });
      setToast(`Đã nâng "${customer.fullName || customer.name || customer.email}" lên quyền chuyên gia.`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đổi được quyền');
    } finally {
      setBusyId(null);
    }
  };

  const deleteCustomer = async (customer: CustomerRow) => {
    if (!token) return;
    if (
      !window.confirm(
        `Xóa vĩnh viễn tài khoản "${customer.fullName || customer.name || customer.email}"?\nHành động không thể hoàn tác.`,
      )
    )
      return;
    setBusyId(customer.id);
    try {
      await apiFetch(`/api/admin/customers/${encodeURIComponent(customer.id)}`, {
        method: 'DELETE',
        token,
      });
      setToast('Đã xóa tài khoản khách hàng.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xóa được');
    } finally {
      setBusyId(null);
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? customers.filter(
        (c) =>
          (c.fullName || c.name || '').toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q),
      )
    : customers;

  return (
    <div className="space-y-6" style={{ color: tezcaTheme.text }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold m-0">Quản lý Khách hàng</h1>
          <p className="text-sm mt-1.5 m-0 opacity-70">
            Danh sách tài khoản khách hàng — phân quyền nhanh hoặc xóa tài khoản.
          </p>
        </div>
      </div>

      {error && <FormAlert variant="error">{error}</FormAlert>}
      {toast && <FormAlert variant="success">{toast}</FormAlert>}

      {/* Search */}
      <div
        className="flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5"
        style={{ borderColor: tezcaTheme.borderStrong, backgroundColor: tezcaTheme.surface }}
      >
        <Search size={16} className="shrink-0 opacity-50" aria-hidden />
        <input
          type="search"
          placeholder="Tìm theo tên hoặc email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-transparent border-0 outline-none text-sm"
          style={{ color: tezcaTheme.text }}
        />
        {search && (
          <span className="text-xs opacity-50 shrink-0">
            {filtered.length}/{customers.length}
          </span>
        )}
      </div>

      <div className="rounded-xl border overflow-hidden" style={tezcaCardStyle}>
        {loading ? (
          <p className="p-8 text-sm opacity-70 m-0 text-center">Đang tải danh sách khách hàng…</p>
        ) : filtered.length === 0 && customers.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title="Chưa có khách hàng"
              description="Chưa có tài khoản khách hàng nào trong hệ thống."
            />
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-sm opacity-70 m-0 text-center">
            Không tìm thấy khách hàng khớp với &ldquo;{search}&rdquo;.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[560px]">
              <thead>
                <tr className="text-sm" style={{ backgroundColor: tezcaTheme.subtleBg }}>
                  <th className="p-3 border-b font-semibold" style={{ borderColor: tezcaTheme.border }}>
                    STT
                  </th>
                  <th className="p-3 border-b font-semibold" style={{ borderColor: tezcaTheme.border }}>
                    Họ và Tên
                  </th>
                  <th className="p-3 border-b font-semibold" style={{ borderColor: tezcaTheme.border }}>
                    Email
                  </th>
                  <th className="p-3 border-b font-semibold text-center" style={{ borderColor: tezcaTheme.border }}>
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((customer, index) => {
                  const displayName = customer.fullName || customer.name || 'Khách hàng';
                  const disabled = busyId === customer.id;
                  return (
                    <tr
                      key={customer.id}
                      className="text-sm hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="p-3 border-b opacity-60" style={{ borderColor: tezcaTheme.border }}>
                        {index + 1}
                      </td>
                      <td className="p-3 border-b font-medium" style={{ borderColor: tezcaTheme.border }}>
                        {displayName}
                      </td>
                      <td className="p-3 border-b" style={{ borderColor: tezcaTheme.border }}>
                        {customer.email}
                      </td>
                      <td className="p-3 border-b text-center" style={{ borderColor: tezcaTheme.border }}>
                        <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => void promoteToExpert(customer)}
                            className="text-teal-600 hover:underline text-sm font-medium border-0 bg-transparent cursor-pointer disabled:opacity-50 p-0 inline-flex items-center gap-1"
                          >
                            <UserPlus size={14} aria-hidden />
                            Nâng lên CG
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => void deleteCustomer(customer)}
                            className="text-red-600 hover:underline text-sm font-medium border-0 bg-transparent cursor-pointer disabled:opacity-50 p-0"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-sm m-0 opacity-70">
        Quản lý tài khoản chuyên gia tại{' '}
        <Link to={ROUTES.admin.experts} className="text-teal-600 underline">
          Quản lý Chuyên gia
        </Link>
        .
      </p>
    </div>
  );
}
