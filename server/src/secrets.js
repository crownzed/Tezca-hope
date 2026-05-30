const DEV_JWT = 'tezca-dev-secret-change-in-production';

let geminiKeyCache;

/** Đọc key một lần — không log giá trị. */
export function getGeminiApiKey() {
  if (geminiKeyCache === undefined) {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || '';
    if (key && key.length < 20) {
      console.warn('[secrets] GOOGLE_GENERATIVE_AI_API_KEY quá ngắn — kiểm tra .env / Vercel env');
    }
    geminiKeyCache = key;
  }
  return geminiKeyCache;
}

export function getJwtSecret() {
  const s = process.env.JWT_SECRET?.trim();
  return s || DEV_JWT;
}

export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

export function assertProductionSecrets() {
  if (!isProduction()) return;

  if (getJwtSecret() === DEV_JWT) {
    console.error(
      '[security] Production yêu cầu JWT_SECRET (không dùng giá trị mặc định). Đặt trong Vercel Environment Variables.',
    );
    // Không process.exit — serverless (Vercel) sẽ crash toàn bộ FUNCTION_INVOCATION_FAILED.
  }

  const key = getGeminiApiKey();
  if (!key) {
    console.warn('[security] Production: chưa có GOOGLE_GENERATIVE_AI_API_KEY — AI sẽ tắt.');
  }
}

const REDACT = [/AIza[\w-]{20,}/gi, /Bearer\s+[\w.-]+/gi, /sk-[\w-]{20,}/gi];

export function redactSecrets(text) {
  if (typeof text !== 'string') return '';
  let out = text;
  for (const p of REDACT) out = out.replace(p, '[đã ẩn]');
  return out;
}

/** Thông báo lỗi an toàn gửi cho client (không lộ key / chi tiết upstream). */
export function sanitizeClientError(err, fallback = 'Lỗi xử lý') {
  if (!(err instanceof Error)) return isProduction() ? fallback : String(err);

  const code = err.code;
  const status = err.status;

  if (isProduction()) {
    if (code === 'GEMINI_NOT_CONFIGURED') return 'AI chưa được cấu hình trên server.';
    if (code === 'GEMINI_HTTP' && (status === 401 || status === 403)) {
      return 'Không thể xác thực với dịch vụ AI. Liên hệ quản trị viên.';
    }
    if (code === 'GEMINI_HTTP' || status >= 500) {
      return 'Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.';
    }
    if (code === 'GEMINI_EMPTY') return 'AI không trả lời được. Thử câu hỏi ngắn hơn.';
    return redactSecrets(err.message).slice(0, 180) || fallback;
  }

  return redactSecrets(err.message).slice(0, 500) || fallback;
}
