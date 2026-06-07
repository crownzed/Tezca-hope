import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { FormAlert } from './tezca/FormAlert';
import { ProfileSectionHeader, ProfileSectionNote } from './profile/ProfileSectionNote';
import { tezcaCardStyle, tezcaTheme } from '../lib/tezcaTheme';
import { saveProfileCache, loadProfileCache } from '../lib/profileCache';

export type CustomerBasicProfile = {
  fullName: string;
  gender: string;
  dob: string;
  phone: string;
  address: string;
  notes: string;
  email?: string;
};

export const EMPTY_CUSTOMER_PROFILE: CustomerBasicProfile = {
  fullName: '',
  gender: '',
  dob: '',
  phone: '',
  address: '',
  notes: '',
};

const inputClass = 'mt-1 w-full rounded-xl px-4 py-3 border text-sm';
const inputStyle = { borderColor: 'rgba(26, 32, 44, 0.12)' };

function genderLabel(gender: string) {
  if (gender === 'male') return 'Nam';
  if (gender === 'female') return 'Nữ';
  if (gender === 'other') return 'Khác';
  return '';
}

type Props = {
  token: string | null;
  userId?: string | null;
  onSaved?: () => void;
};

export function CustomerProfileForm({ token, userId, onSaved }: Props) {
  const [saved, setSaved] = useState<CustomerBasicProfile>(EMPTY_CUSTOMER_PROFILE);
  const [draft, setDraft] = useState<CustomerBasicProfile>(EMPTY_CUSTOMER_PROFILE);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiFetch<{ profile: CustomerBasicProfile & { email?: string } }>('/api/me/profile', { token })
      .then(async (r) => {
        const serverProfile = r.profile;
        const isServerEmpty = !serverProfile?.fullName?.trim();

        if (!isServerEmpty) {
          // Server has data — use it and update cache
          const profile: CustomerBasicProfile = {
            fullName: serverProfile!.fullName || '',
            gender: serverProfile!.gender || '',
            dob: serverProfile!.dob || '',
            phone: serverProfile!.phone || '',
            address: serverProfile!.address || '',
            notes: serverProfile!.notes || '',
          };
          setSaved(profile);
          setDraft(profile);
          if (userId) saveProfileCache(userId, profile);
        } else {
          // Server is empty (cold start) — restore from localStorage cache
          const cached = userId ? loadProfileCache(userId) : null;
          if (cached?.fullName?.trim()) {
            // Sync cache back to server silently
            try {
              const res = await apiFetch<{ profile: CustomerBasicProfile & { email?: string } }>(
                '/api/me/profile',
                { method: 'PUT', token, body: JSON.stringify(cached) },
              );
              const synced: CustomerBasicProfile = {
                fullName: res.profile?.fullName || cached.fullName,
                gender: res.profile?.gender || cached.gender,
                dob: res.profile?.dob || cached.dob,
                phone: res.profile?.phone || cached.phone,
                address: res.profile?.address || cached.address,
                notes: res.profile?.notes || cached.notes,
              };
              setSaved(synced);
              setDraft(synced);
              window.dispatchEvent(new Event('tezca:profile-saved'));
            } catch {
              // Sync failed — still show cached data locally
              setSaved(cached);
              setDraft(cached);
            }
          }
        }
      })
      .catch(() => setMessage('Không tải được hồ sơ'))
      .finally(() => setLoading(false));
  }, [token, userId]);

  const setField = (key: keyof CustomerBasicProfile, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const startEdit = () => {
    setDraft(saved);
    setEditing(true);
    setMessage('');
  };

  const cancelEdit = () => {
    setDraft(saved);
    setEditing(false);
    setMessage('');
  };

  const save = async () => {
    if (!token) {
      setMessage('Đăng nhập để lưu hồ sơ.');
      return;
    }
    if (!draft.fullName.trim()) {
      setMessage('Vui lòng nhập họ tên.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      const res = await apiFetch<{ profile: CustomerBasicProfile & { email?: string } }>('/api/me/profile', {
        method: 'PUT',
        token,
        body: JSON.stringify(draft),
      });
      const confirmed = res.profile
        ? {
            fullName: res.profile.fullName || '',
            gender: res.profile.gender || '',
            dob: res.profile.dob || '',
            phone: res.profile.phone || '',
            address: res.profile.address || '',
            notes: res.profile.notes || '',
          }
        : draft;
      setSaved(confirmed);
      setDraft(confirmed);
      setEditing(false);
      setMessage('Đã cập nhật hồ sơ. Thông tin sẽ gửi tới chuyên gia khi bạn yêu cầu đồng hành.');
      if (userId) saveProfileCache(userId, confirmed);
      window.dispatchEvent(new Event('tezca:profile-saved'));
      onSaved?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Không lưu được hồ sơ');
    } finally {
      setSaving(false);
    }
  };

  if (loading && token) {
    return <p className="text-sm opacity-60 m-0">Đang tải hồ sơ…</p>;
  }

  const hasData = Boolean(saved.fullName?.trim());

  return (
    <div className="space-y-4">
      <ProfileSectionHeader
        title="Thông tin cá nhân"
        subtitle={hasData ? 'Xem hoặc sửa từng mục trước khi gửi chuyên gia.' : 'Chưa có thông tin — nhấn Sửa để điền.'}
        editing={editing}
        onEdit={!editing ? startEdit : undefined}
        onCancel={editing ? cancelEdit : undefined}
      />

      {message && (
        <FormAlert variant={message.includes('Đã cập nhật') ? 'success' : undefined}>{message}</FormAlert>
      )}

      {!editing && (
        <div className="space-y-3">
          <ProfileSectionNote title="Họ và tên" value={saved.fullName} emptyLabel="Chưa có" />
          <div className="grid sm:grid-cols-2 gap-3">
            <ProfileSectionNote title="Giới tính" value={genderLabel(saved.gender)} />
            <ProfileSectionNote title="Ngày sinh" value={saved.dob} />
          </div>
          <ProfileSectionNote title="Số điện thoại" value={saved.phone} />
          <ProfileSectionNote title="Địa chỉ" value={saved.address} />
          <ProfileSectionNote
            title="Ghi chú cho chuyên gia"
            hint="Mục tiêu, thói quen, lưu ý đồng hành"
            value={saved.notes}
          />
        </div>
      )}

      {editing && (
        <div className="space-y-4 rounded-xl border p-4" style={tezcaCardStyle}>
          <p className="text-xs font-semibold uppercase tracking-wide m-0 opacity-60" style={{ color: tezcaTheme.accentDark }}>
            Chỉnh sửa
          </p>
          <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
            Họ và tên *
            <input
              type="text"
              value={draft.fullName}
              onChange={(e) => setField('fullName', e.target.value)}
              className={inputClass}
              style={inputStyle}
              required
            />
          </label>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
              Giới tính
              <select
                value={draft.gender}
                onChange={(e) => setField('gender', e.target.value)}
                className={inputClass}
                style={inputStyle}
              >
                <option value="">— Chọn —</option>
                <option value="female">Nữ</option>
                <option value="male">Nam</option>
                <option value="other">Khác</option>
              </select>
            </label>
            <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
              Ngày sinh
              <input
                type="date"
                value={draft.dob}
                onChange={(e) => setField('dob', e.target.value)}
                className={inputClass}
                style={inputStyle}
              />
            </label>
          </div>
          <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
            Số điện thoại
            <input
              type="tel"
              value={draft.phone}
              onChange={(e) => setField('phone', e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </label>
          <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
            Địa chỉ
            <input
              type="text"
              value={draft.address}
              onChange={(e) => setField('address', e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </label>
          <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
            Ghi chú cho chuyên gia
            <textarea
              value={draft.notes}
              onChange={(e) => setField('notes', e.target.value)}
              rows={4}
              className={`${inputClass} resize-y min-h-[96px]`}
              style={inputStyle}
              placeholder="Ví dụ: muốn giảm 5kg trong 3 tháng, tập tại nhà 3 buổi/tuần…"
            />
          </label>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="rounded-full px-8 py-3 font-semibold border-0 cursor-pointer disabled:opacity-60"
            style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
          >
            {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
          </button>
        </div>
      )}
    </div>
  );
}

export function isCustomerProfileComplete(profile: CustomerBasicProfile | null | undefined) {
  return Boolean(profile?.fullName?.trim());
}
