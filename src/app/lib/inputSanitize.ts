/**
 * Frontend input sanitization — defense-in-depth trước khi gửi API.
 * Backend vẫn là lớp bảo vệ chính, đây là lớp phụ để bắt sớm.
 */

/** Loại bỏ ký tự control (trừ newline, tab) */
export function stripControlChars(input: string): string {
  // Giữ \n (10), \r (13), \t (9)
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/** Trim + giới hạn độ dài */
export function sanitizeText(input: string, maxLength = 5000): string {
  const cleaned = stripControlChars(input).trim();
  return cleaned.slice(0, maxLength);
}

/** Sanitize tên (không cho HTML tags, script) */
export function sanitizeName(input: string, maxLength = 120): string {
  return stripControlChars(input)
    .replace(/<[^>]*>/g, '') // Xóa HTML tags
    .trim()
    .slice(0, maxLength);
}

/** Sanitize email — lowercase, trim */
export function sanitizeEmail(input: string): string {
  return input.trim().toLowerCase().slice(0, 254);
}

/** Kiểm tra URL an toàn (chỉ http/https) */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Sanitize nội dung post/comment — strip control chars, giới hạn length */
export function sanitizeContent(input: string, maxLength = 10000): string {
  return sanitizeText(input, maxLength);
}

/** Sanitize search query */
export function sanitizeQuery(input: string, maxLength = 200): string {
  return stripControlChars(input).trim().slice(0, maxLength);
}
