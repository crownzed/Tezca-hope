import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { EXPERT_SPECIALTY_TYPES } from '../lib/communityTopics';
import { FormAlert } from './tezca/FormAlert';
import { ProfileSectionField, ProfileSectionHeader, ProfileSectionNote } from './profile/ProfileSectionNote';
import { tezcaCardStyle, tezcaTheme } from '../lib/tezcaTheme';

export type ExpertPublicProfile = {
  fullName: string;
  gender: string;
  specialty: string;
  licenseNo: string;
  bio: string;
};

export const EMPTY_EXPERT_PROFILE: ExpertPublicProfile = {
  fullName: '',
  gender: '',
  specialty: 'nutrition',
  licenseNo: '',
  bio: '',
};

const inputClass = 'mt-1 w-full rounded-xl px-4 py-3 border text-sm';
const inputStyle = { borderColor: 'rgba(26, 32, 44, 0.12)' };

function specialtyLabel(id: string) {
  return EXPERT_SPECIALTY_TYPES.find((t) => t.id === id)?.label ?? id;
}

type Props = { token: string | null };

export function ExpertProfileForm({ token }: Props) {
  const [saved, setSaved] = useState<ExpertPublicProfile>(EMPTY_EXPERT_PROFILE);
  const [draft, setDraft] = useState<ExpertPublicProfile>(EMPTY_EXPERT_PROFILE);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiFetch<{ profile: ExpertPublicProfile }>('/api/expert/me/profile', { token })
      .then((r) => {
        if (r.profile) {
          const p: ExpertPublicProfile = {
            fullName: r.profile.fullName || '',
            gender: r.profile.gender || '',
            specialty: r.profile.specialty || 'nutrition',
            licenseNo: r.profile.licenseNo || '',
            bio: r.profile.bio || '',
          };
          setSaved(p);
          setDraft(p);
        }
      })
      .catch(() => setMessage('Không tải được hồ sơ chuyên gia'))
      .finally(() => setLoading(false));
  }, [token]);

  const setField = (key: keyof ExpertPublicProfile, value: string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const startEdit = () => { setDraft(saved); setEditing(true); setMessage(''); };
  const cancelEdit = () => { setDraft(saved); setEditing(false); setMessage(''); };

  const save = async () => {
    if (!token) return;
    if (!draft.fullName.trim()) { setMessage('Vui lòng nhập họ tên hiển thị.'); return; }
    setSaving(true);
    setMessage('');
    try {
      await apiFetch('/api/expert/me/profile', {
        method: 'PUT',
        token,
        body: JSON.stringify(draft),
      });
      setSaved(draft);
      setEditing(false);
      setMessage('Đã cập nhật hồ sơ. Thông tin hiển thị khi khách hàng chọn chuyên gia.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Không lưu được');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm opacity-60 m-0">Đang tải hồ sơ…</p>;

  const hasData = Boolean(saved.fullName?.trim());

  return (
    <div className="space-y-4">
      <ProfileSectionHeader
        title="Hồ sơ công khai"
        subtitle={
          hasData
            ? 'Thông tin hiển thị khi khách hàng chọn chuyên gia.'
            : 'Chưa có thông tin — nhấn Sửa để điền.'
        }
        editing={editing}
        onEdit={!editing ? startEdit : undefined}
        onCancel={editing ? cancelEdit : undefined}
      />

      {message && (
        <FormAlert variant={message.includes('Đã cập nhật') ? 'success' : undefined}>
          {message}
        </FormAlert>
      )}

      {!editing && (
        <div className="space-y-3">
          <ProfileSectionNote title="Họ tên hiển thị" value={saved.fullName} emptyLabel="Chưa điền" />
          <div className="grid sm:grid-cols-2 gap-3">
            <ProfileSectionNote
              title="Chuyên ngành"
              value={saved.specialty ? `${EXPERT_SPECIALTY_TYPES.find(t => t.id === saved.specialty)?.icon ?? ''} ${specialtyLabel(saved.specialty)}`.trim() : ''}
            />
            <ProfileSectionNote title="Mã hành nghề" value={saved.licenseNo} />
          </div>
          <ProfileSectionNote
            title="Giới thiệu (bio)"
            hint="Kinh nghiệm, phương pháp, đối tượng phù hợp"
            value={saved.bio}
          />
        </div>
      )}

      {editing && (
        <div className="space-y-4 rounded-xl border p-4" style={tezcaCardStyle}>
          <p className="text-xs font-semibold uppercase tracking-wide m-0 opacity-60" style={{ color: tezcaTheme.accentDark }}>
            Chỉnh sửa
          </p>
          <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
            Họ tên hiển thị *
            <input
              type="text"
              value={draft.fullName}
              onChange={(e) => setField('fullName', e.target.value)}
              className={inputClass}
              style={inputStyle}
            />
          </label>
          <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
            Chuyên ngành *
            <select
              value={draft.specialty}
              onChange={(e) => setField('specialty', e.target.value)}
              className={inputClass}
              style={inputStyle}
            >
              {EXPERT_SPECIALTY_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
            Số chứng chỉ / mã hành nghề
            <input
              type="text"
              value={draft.licenseNo}
              onChange={(e) => setField('licenseNo', e.target.value)}
              className={inputClass}
              style={inputStyle}
              placeholder="Tùy chọn"
            />
          </label>
          <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
            Giới thiệu ngắn (bio)
            <textarea
              value={draft.bio}
              onChange={(e) => setField('bio', e.target.value)}
              rows={5}
              className={`${inputClass} resize-y min-h-[120px]`}
              style={inputStyle}
              placeholder="Kinh nghiệm, phương pháp làm việc, đối tượng khách hàng phù hợp…"
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

export function isExpertProfileComplete(profile: ExpertPublicProfile | null | undefined) {
  return Boolean(profile?.fullName?.trim() && profile?.bio?.trim());
}
