import { DbError } from '../dbErrors.js';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function assertIsoDate(dateIso) {
  const d = String(dateIso || '').trim().slice(0, 10);
  if (!ISO_DATE_RE.test(d)) {
    throw new DbError('INVALID_DATE', 'Ngày phải dạng YYYY-MM-DD', 400);
  }
  const [y, m, day] = d.split('-').map(Number);
  const dt = new Date(y, m - 1, day);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== day) {
    throw new DbError('INVALID_DATE', 'Ngày không hợp lệ', 400);
  }
  return d;
}

export function assertNonEmptyId(id, label = 'id') {
  const s = String(id || '').trim();
  if (!s) throw new DbError('INVALID_ID', `${label} không hợp lệ`, 400);
  return s;
}

export function todayIsoLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
