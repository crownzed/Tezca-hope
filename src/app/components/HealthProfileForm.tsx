import { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import { FormAlert } from './tezca/FormAlert';
import { tezcaTheme } from '../lib/tezcaTheme';

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

const inputClass = 'mt-1 w-full rounded-xl px-4 py-3 border text-sm resize-y min-h-[72px]';
const inputStyle = { borderColor: 'rgba(26, 32, 44, 0.12)' };

type Props = {
  token: string | null;
  compact?: boolean;
};

export function HealthProfileForm({ token, compact }: Props) {
  const [form, setForm] = useState<HealthProfile>(EMPTY_HEALTH_PROFILE);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiFetch<{ profile: HealthProfile | null }>('/api/me/health-profile', { token })
      .then((r) => setForm(r.profile || EMPTY_HEALTH_PROFILE))
      .catch(() => setMessage('Không tải được hồ sơ bệnh lý'))
      .finally(() => setLoading(false));
  }, [token]);

  const setField = (key: keyof HealthProfile, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!token) {
      setMessage('Đăng nhập để lưu hồ sơ bệnh lý lên máy chủ.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await apiFetch('/api/me/health-profile', {
        method: 'PUT',
        token,
        body: JSON.stringify(form),
      });
      setMessage('Đã lưu hồ sơ bệnh lý.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Không lưu được hồ sơ');
    } finally {
      setSaving(false);
    }
  };

  if (loading && token) {
    return <p className="text-sm opacity-60 m-0">Đang tải hồ sơ bệnh lý…</p>;
  }

  return (
    <div className={compact ? 'space-y-4' : 'space-y-4'}>
      {!compact && (
        <p className="text-sm opacity-70 m-0" style={{ color: tezcaTheme.text }}>
          Bệnh nền, dị ứng và chống chỉ định giúp AI và chuyên gia đưa phác đồ phù hợp hơn — bổ sung cùng chỉ số BMI.
        </p>
      )}
      {message && (
        <FormAlert variant={message.includes('Đã lưu') ? 'success' : undefined}>{message}</FormAlert>
      )}
      <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
        Tình trạng hiện tại (bệnh đang mắc, đau ốm gần đây)
        <textarea
          value={form.currentConditions}
          onChange={(e) => setField('currentConditions', e.target.value)}
          placeholder="Ví dụ: tiểu đường type 2, đau lưng cấp tính tuần trước…"
          className={inputClass}
          style={inputStyle}
          rows={3}
        />
      </label>
      <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
        Tiền sử bệnh lý
        <textarea
          value={form.medicalHistory}
          onChange={(e) => setField('medicalHistory', e.target.value)}
          placeholder="Các vấn đề từng trải qua, phẫu thuật, nằm viện…"
          className={inputClass}
          style={inputStyle}
          rows={3}
        />
      </label>
      <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
        Dị ứng
        <textarea
          value={form.allergies}
          onChange={(e) => setField('allergies', e.target.value)}
          className={inputClass}
          style={inputStyle}
          rows={2}
        />
      </label>
      <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
        Thuốc đang dùng
        <textarea
          value={form.medications}
          onChange={(e) => setField('medications', e.target.value)}
          className={inputClass}
          style={inputStyle}
          rows={2}
        />
      </label>
      <label className="block text-sm font-medium" style={{ color: tezcaTheme.text }}>
        Chống chỉ định vận động / dinh dưỡng
        <textarea
          value={form.contraindications}
          onChange={(e) => setField('contraindications', e.target.value)}
          className={inputClass}
          style={inputStyle}
          rows={2}
        />
      </label>
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="rounded-full px-8 py-3 font-semibold text-white border-0 cursor-pointer disabled:opacity-60"
        style={{ background: tezcaTheme.accentGradient, color: tezcaTheme.text }}
      >
        {saving ? 'Đang lưu…' : 'Lưu hồ sơ bệnh lý'}
      </button>
    </div>
  );
}
