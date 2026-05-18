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
  if (p.length < 8) return 'Mật khẩu cần ít nhất 8 ký tự';
  if (p.length > 128) return 'Mật khẩu quá dài (tối đa 128 ký tự)';
  return null;
}
