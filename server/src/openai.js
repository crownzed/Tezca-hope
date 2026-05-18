/**
 * Gọi OpenAI Chat Completions (API key chỉ trên server).
 * Biến môi trường: OPENAI_API_KEY (bắt buộc), OPENAI_MODEL (mặc định gpt-4o-mini).
 */

const API_URL = 'https://api.openai.com/v1/chat/completions';

export function isOpenAiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function model() {
  return process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
}

/**
 * @param {Array<{ role: 'system' | 'user' | 'assistant'; content: string }>} messages
 * @param {{ temperature?: number; max_tokens?: number }} opts
 */
export async function openaiChat(messages, opts = {}) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    const err = new Error('Chưa cấu hình OPENAI_API_KEY trên server');
    err.code = 'OPENAI_NOT_CONFIGURED';
    throw err;
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model(),
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens ?? 1200,
    }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      data?.error?.message ||
      data?.error ||
      `${res.status} ${res.statusText}`;
    const err = new Error(typeof msg === 'string' ? msg : 'OpenAI lỗi không xác định');
    err.code = 'OPENAI_HTTP';
    err.status = res.status;
    throw err;
  }

  const text = data?.choices?.[0]?.message?.content;
  if (!text || typeof text !== 'string') {
    const err = new Error('OpenAI không trả nội dung hợp lệ');
    err.code = 'OPENAI_EMPTY';
    throw err;
  }

  return text.trim();
}
