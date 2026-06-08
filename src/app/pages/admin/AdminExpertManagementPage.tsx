import { useCallback, useEffect, useState } from 'react';
import { GraduationCap, Plus, X } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { FormAlert } from '../../components/tezca/FormAlert';
import { EmptyState } from '../../components/tezca/EmptyState';
import { authInputClass, authInputStyle } from '../../components/tezca/AuthFormCard';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';

type ExpertRow = {
  id: string;
  email: string;
  fullName?: string;
  name?: string;
  specialty?: string;
  isActive?: boolean;
};

type ExpertForm = {
  fullName: string;
  email: string;
  password: string;
  specialty: string;
};

const emptyForm: ExpertForm = { fullName: '', email: '', password: '', specialty: '' };

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
      Hoạt động
    </span>
  ) : (
    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
      Đã khóa
    </span>
  );
}

export function AdminExpertManagementPage() {
  const { token } = useAdminAuth();
  const [experts, setExperts] = useState<ExpertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExpertRow | null>(null);
  const [form, setForm] = useState<ExpertForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    apiFetch<{ experts: ExpertRow[] }>('/api/admin/experts', { token })
      .then((r) => {
        setExperts(r.experts);
        setError('');
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Không tải được danh sách chuyên gia'))
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

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (expert: ExpertRow) => {
    setEditing(expert);
    setForm({
      fullName: expert.fullName || expert.name || '',
      email: expert.email,
      password: '',
      specialty: expert.specialty || '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const saveExpert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await apiFetch(`/api/admin/experts/${encodeURIComponent(editing.id)}`, {
          method: 'PATCH',
          token,
          body: JSON.stringify({
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            specialty: form.specialty.trim(),
          }),
        });
        setToast('Đã cập nhật hồ sơ chuyên gia.');
      } else {
        await apiFetch('/api/admin/experts', {
          method: 'POST',
          token,
          body: JSON.stringify({
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            password: form.password,
            specialty: form.specialty.trim(),
          }),
        });
        setToast('Đã tạo tài khoản chuyên gia.');
      }
      closeModal();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được');
    } finally {
      setSaving(false);
    }
  };

  const toggleLock = async (expert: ExpertRow) => {
    if (!token) return;
    const nextActive = expert.isActive === false;
    const label = nextActive ? 'mở khóa' : 'khóa';
    if (!window.confirm(`${nextActive ? 'Mở khóa' : 'Khóa'} tài khoản "${expert.fullName || expert.name || expert.email}"?`)) return;
    setBusyId(expert.id);
    try {
      await apiFetch(`/api/admin/experts/${encodeURIComponent(expert.id)}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ isActive: nextActive }),
      });
      setToast(`Đã ${label} tài khoản chuyên gia.`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Không ${label} được`);
    } finally {
      setBusyId(null);
    }
  };

  const removeExpert = async (expert: ExpertRow) => {
    if (!token) return;
    if (
      !window.confirm(
        `Xóa vĩnh viễn tài khoản "${expert.fullName || expert.name || expert.email}"? Hành động không thể hoàn tác.`,
      )
    ) {
      return;
    }
    setBusyId(expert.id);
    try {
      await apiFetch(`/api/admin/experts/${encodeURIComponent(expert.id)}`, { method: 'DELETE', token });
      setToast('Đã xóa tài khoản chuyên gia.');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xóa được');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold m-0" style={{ color: tezcaTheme.text }}>
            Quản lý Hồ sơ Chuyên gia
          </h1>
          <p className="text-sm mt-1.5 m-0 opacity-70" style={{ color: tezcaTheme.textMuted }}>
            Tạo, chỉnh sửa, khóa hoặc xóa tài khoản chuyên gia trên hệ thống Tezca.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border-0 cursor-pointer shadow-sm"
          style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
        >
          <Plus size={18} aria-hidden />
          Thêm tài khoản chuyên gia
        </button>
      </div>

      {error && <FormAlert variant="error">{error}</FormAlert>}
      {toast && <FormAlert variant="success">{toast}</FormAlert>}

      <div className="rounded-xl border overflow-hidden" style={tezcaCardStyle}>
        {loading ? (
          <p className="p-8 text-sm opacity-70 m-0 text-center">Đang tải danh sách chuyên gia…</p>
        ) : experts.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={GraduationCap}
              title="Chưa có chuyên gia"
              description="Thêm tài khoản chuyên gia đầu tiên để khách hàng có thể được gán và đồng hành."
              actionLabel="Thêm tài khoản chuyên gia"
              onAction={openCreate}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[640px]">
              <thead>
                <tr className="text-sm" style={{ backgroundColor: tezcaTheme.subtleBg, color: tezcaTheme.text }}>
                  <th className="p-3 border-b font-semibold" style={{ borderColor: tezcaTheme.border }}>
                    STT
                  </th>
                  <th className="p-3 border-b font-semibold" style={{ borderColor: tezcaTheme.border }}>
                    Họ và Tên
                  </th>
                  <th className="p-3 border-b font-semibold" style={{ borderColor: tezcaTheme.border }}>
                    Email
                  </th>
                  <th className="p-3 border-b font-semibold" style={{ borderColor: tezcaTheme.border }}>
                    Chuyên môn
                  </th>
                  <th className="p-3 border-b font-semibold" style={{ borderColor: tezcaTheme.border }}>
                    Trạng thái
                  </th>
                  <th className="p-3 border-b font-semibold text-center" style={{ borderColor: tezcaTheme.border }}>
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody>
                {experts.map((expert, index) => {
                  const displayName = expert.fullName || expert.name || 'Chuyên gia';
                  const active = expert.isActive !== false;
                  const disabled = busyId === expert.id;
                  return (
                    <tr
                      key={expert.id}
                      className="text-sm hover:bg-slate-50/80 transition-colors"
                      style={{ color: tezcaTheme.text }}
                    >
                      <td className="p-3 border-b opacity-60" style={{ borderColor: tezcaTheme.border }}>
                        {index + 1}
                      </td>
                      <td className="p-3 border-b font-medium" style={{ borderColor: tezcaTheme.border }}>
                        {displayName}
                      </td>
                      <td className="p-3 border-b" style={{ borderColor: tezcaTheme.border }}>
                        {expert.email}
                      </td>
                      <td className="p-3 border-b opacity-80" style={{ borderColor: tezcaTheme.border }}>
                        {expert.specialty || '—'}
                      </td>
                      <td className="p-3 border-b" style={{ borderColor: tezcaTheme.border }}>
                        <StatusBadge active={active} />
                      </td>
                      <td className="p-3 border-b text-center" style={{ borderColor: tezcaTheme.border }}>
                        <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => openEdit(expert)}
                            className="text-teal-600 hover:underline text-sm font-medium border-0 bg-transparent cursor-pointer disabled:opacity-50 p-0"
                          >
                            Sửa
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => void removeExpert(expert)}
                            className="text-red-600 hover:underline text-sm font-medium border-0 bg-transparent cursor-pointer disabled:opacity-50 p-0"
                          >
                            Xóa
                          </button>
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => void toggleLock(expert)}
                            className={`text-sm font-medium border-0 bg-transparent cursor-pointer disabled:opacity-50 p-0 hover:underline ${
                              active ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                          >
                            {active ? 'Khóa' : 'Mở khóa'}
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

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.45)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="expert-form-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border p-6 shadow-xl"
            style={{ backgroundColor: tezcaTheme.surface, borderColor: tezcaTheme.border }}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <h2 id="expert-form-title" className="text-lg font-semibold m-0" style={{ color: tezcaTheme.text }}>
                {editing ? 'Sửa hồ sơ chuyên gia' : 'Thêm tài khoản chuyên gia'}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded-lg border-0 bg-transparent cursor-pointer opacity-60 hover:opacity-100"
                aria-label="Đóng"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(e) => void saveExpert(e)} className="space-y-4">
              <label className="block text-sm">
                Họ và tên
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))}
                  className={authInputClass}
                  style={authInputStyle()}
                  placeholder="Nguyễn Văn A"
                />
              </label>
              <label className="block text-sm">
                Email
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                  className={authInputClass}
                  style={authInputStyle()}
                  placeholder="chuyen.gia@tezca.vn"
                />
              </label>
              {!editing && (
                <label className="block text-sm">
                  Mật khẩu
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                    className={authInputClass}
                    style={authInputStyle()}
                    placeholder="Tối thiểu 8 ký tự"
                  />
                </label>
              )}
              <label className="block text-sm">
                Chuyên môn
                <input
                  value={form.specialty}
                  onChange={(e) => setForm((s) => ({ ...s, specialty: e.target.value }))}
                  className={authInputClass}
                  style={authInputStyle()}
                  placeholder="Dinh dưỡng, vận động…"
                />
              </label>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-2.5 rounded-lg border text-sm font-medium cursor-pointer"
                  style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.text, backgroundColor: 'transparent' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold border-0 cursor-pointer disabled:opacity-50"
                  style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
                >
                  {saving ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
