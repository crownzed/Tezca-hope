/** Chuẩn hóa + kiểm tra email đăng ký / đăng nhập */
export function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

export function isValidEmail(email) {
  const e = normalizeEmail(email);
  if (!e || e.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/** Mật khẩu tối thiểu 8 ký tự — tránh hash vô nghĩa */
export function validatePassword(password) {
  const p = String(password || '');
  if (p.trim().length < 8) return 'Mật khẩu cần ít nhất 8 ký tự (không chỉ khoảng trắng)';
  if (p.length > 128) return 'Mật khẩu quá dài (tối đa 128 ký tự)';
  return null;
}

/** Kiểm tra imageUrl hợp lệ — chỉ cho phép HTTPS URL hoặc data:image/ base64 */
const MAX_IMAGE_URL_LENGTH = 2_000_000;
const ALLOWED_IMAGE_DATA_PREFIX = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/;
const ALLOWED_IMAGE_HTTPS = /^https:\/\//i;

export function validateImageUrl(raw) {
  if (!raw) return { valid: true, sanitized: '' };
  const trimmed = String(raw).trim();
  if (!trimmed) return { valid: true, sanitized: '' };
  if (trimmed.length > MAX_IMAGE_URL_LENGTH) {
    return { valid: false, error: 'Ảnh quá lớn (tối đa ~1.5 MB sau nén)' };
  }
  if (ALLOWED_IMAGE_DATA_PREFIX.test(trimmed)) {
    return { valid: true, sanitized: trimmed };
  }
  if (ALLOWED_IMAGE_HTTPS.test(trimmed)) {
    // Chặn javascript: / data: ẩn trong URL
    if (/[\x00-\x1f]/g.test(trimmed)) {
      return { valid: false, error: 'URL ảnh chứa ký tự không hợp lệ' };
    }
    return { valid: true, sanitized: trimmed };
  }
  return { valid: false, error: 'URL ảnh phải là HTTPS hoặc data:image/ base64' };
}
