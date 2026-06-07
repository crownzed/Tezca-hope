import { Pencil } from 'lucide-react';
import { tezcaCardStyle, tezcaTheme } from '../../lib/tezcaTheme';

const inputClass = 'mt-2 w-full rounded-xl px-4 py-3 border text-sm resize-y';
const inputStyle = { borderColor: 'rgba(26, 32, 44, 0.12)' };

type ReadProps = {
  title: string;
  hint?: string;
  value?: string;
  emptyLabel?: string;
};

export function ProfileSectionNote({ title, hint, value, emptyLabel = 'Chưa ghi nhận' }: ReadProps) {
  const text = value?.trim();
  return (
    <article className="rounded-xl border p-4" style={tezcaCardStyle}>
      <h3 className="text-sm font-semibold m-0" style={{ color: tezcaTheme.text }}>
        {title}
      </h3>
      {hint && (
        <p className="text-xs m-0 mt-1 opacity-60" style={{ color: tezcaTheme.textMuted }}>
          {hint}
        </p>
      )}
      <p
        className={`text-sm m-0 mt-3 whitespace-pre-wrap leading-relaxed ${text ? '' : 'opacity-50 italic'}`}
        style={{ color: tezcaTheme.text }}
      >
        {text || emptyLabel}
      </p>
    </article>
  );
}

type EditProps = ReadProps & {
  rows?: number;
  placeholder?: string;
  onChange: (value: string) => void;
};

export function ProfileSectionField({ title, hint, value, placeholder, rows = 3, onChange }: EditProps) {
  return (
    <label className="block rounded-xl border p-4" style={tezcaCardStyle}>
      <span className="text-sm font-semibold" style={{ color: tezcaTheme.text }}>
        {title}
      </span>
      {hint && (
        <span className="block text-xs mt-1 opacity-60" style={{ color: tezcaTheme.textMuted }}>
          {hint}
        </span>
      )}
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={inputClass}
        style={inputStyle}
      />
    </label>
  );
}

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  editing?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
};

export function ProfileSectionHeader({ title, subtitle, editing, onEdit, onCancel }: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold m-0" style={{ color: tezcaTheme.text }}>
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm opacity-70 m-0 mt-1" style={{ color: tezcaTheme.text }}>
            {subtitle}
          </p>
        )}
      </div>
      {!editing && onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold border cursor-pointer hover:opacity-90"
          style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.accentDark, backgroundColor: tezcaTheme.surface }}
        >
          <Pencil size={14} aria-hidden />
          Sửa
        </button>
      )}
      {editing && onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-4 py-2 text-sm font-medium border cursor-pointer"
          style={{ borderColor: tezcaTheme.borderStrong, color: tezcaTheme.textMuted, backgroundColor: 'transparent' }}
        >
          Hủy
        </button>
      )}
    </div>
  );
}
