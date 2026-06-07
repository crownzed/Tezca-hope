import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { HEALTH_PROFILE_SECTIONS, hasHealthProfileData } from '../lib/healthProfileSections';
import { FormAlert } from './tezca/FormAlert';
import { ProfileSectionField, ProfileSectionHeader, ProfileSectionNote } from './profile/ProfileSectionNote';
import { tezcaTheme } from '../lib/tezcaTheme';
import { saveHealthCache, loadHealthCache } from '../lib/profileCache';

export type HealthProfile = {
  currentConditions: string;
  medicalHistory: string;
  allergies: string;
  medications: string;
  contraindications: string;
};

export const EMPTY_HEALTH_PROFILE: HealthProfile = {
  currentConditions: '',
  medicalHistory: '',
  allergies: '',
  medications: '',
  contraindications: '',
};

type Props = {
  token: string | null;
  userId?: string | null;
  compact?: boolean;
};

export function HealthProfileForm({ token, userId, compact }: Props) {
  const [saved, setSaved] = useState<HealthProfile>(EMPTY_HEALTH_PROFILE);
  const [draft, setDraft] = useState<HealthProfile>(EMPTY_HEALTH_PROFILE);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiFetch<{ profile: HealthProfile | null }>('/api/me/health-profile', { token })
      .then(async (r) => {
        const isServerEmpty = !r.profile || !Object.values(r.profile).some((v) => String(v).trim());
        if (!isServerEmpty) {
          const profile = r.profile!;
          setSaved(profile);
          setDraft(profile);
          if (userId) saveHealthCache(userId, profile);
        } else {
          const cached = userId ? loadHealthCache(userId) : null;
          const hasCache = cached && Object.values(cached).some((v) => String(v).trim());
          if (hasCache) {
            try {
              await apiFetch('/api/me/health-profile', {
                method: 'PUT',
                token,
                body: JSON.stringify(cached),
              });
            } catch {}
            setSaved(cached!);
            setDraft(cached!);
          }
        }
      })
      .catch(() => setMessage('Không tải được hồ sơ bệnh lý'))
      .finally(() => setLoading(false));
  }, [token, userId]);

  const setField = (key: keyof HealthProfile, value: string) => {
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
      setMessage('Đăng nhập để lưu hồ sơ bệnh lý.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await apiFetch('/api/me/health-profile', {
        method: 'PUT',
        token,
        body: JSON.stringify(draft),
      });
      setSaved(draft);
      setEditing(false);
      setMessage('Đã cập nhật hồ sơ bệnh lý.');
      if (userId) saveHealthCache(userId, draft);
      window.dispatchEvent(new Event('tezca:profile-saved'));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Không lưu được hồ sơ');
    } finally {
      setSaving(false);
    }
  };

  if (loading && token) {
    return <p className="text-sm opacity-60 m-0">Đang tải hồ sơ bệnh lý…</p>;
  }

  const hasData = hasHealthProfileData(saved);

  return (
    <div className={compact ? 'space-y-4' : 'space-y-4'}>
      <ProfileSectionHeader
        title="Ghi chú theo mục"
        subtitle={
          hasData
            ? 'Mỗi mục lưu riêng — chuyên gia và AI đọc theo từng phần.'
            : 'Chưa có ghi chú. Nhấn Sửa để bổ sung từng mục.'
        }
        editing={editing}
        onEdit={!editing ? startEdit : undefined}
        onCancel={editing ? cancelEdit : undefined}
      />

      {message && (
        <FormAlert variant={message.includes('Đã cập nhật') ? 'success' : undefined}>{message}</FormAlert>
      )}

      {!editing && (
        <div className="space-y-3">
          {HEALTH_PROFILE_SECTIONS.map((section) => (
            <ProfileSectionNote
              key={section.key}
              title={section.title}
              hint={section.hint}
              value={saved[section.key]}
            />
          ))}
        </div>
      )}

      {editing && (
        <div className="space-y-3">
          {HEALTH_PROFILE_SECTIONS.map((section) => (
            <ProfileSectionField
              key={section.key}
              title={section.title}
              hint={section.hint}
              value={draft[section.key]}
              placeholder={section.placeholder}
              rows={section.rows}
              onChange={(v) => setField(section.key, v)}
            />
          ))}
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
