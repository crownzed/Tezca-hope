/**
 * Google Gemini — key chỉ trên server, gửi qua header (không đưa vào URL).
 */
import { getGeminiApiKey, redactSecrets } from './secrets.js';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export function isGeminiConfigured() {
  return Boolean(getGeminiApiKey());
}

function model() {
  return process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim() || 'gemini-2.5-flash';
}

/**
 * @param {Array<{ role: 'system' | 'user' | 'assistant'; content: string }>} messages
 */
function toGeminiPayload(messages) {
  let systemText = '';
  const contents = [];

  for (const m of messages) {
    if (!m?.content || typeof m.content !== 'string') continue;
    if (m.role === 'system') {
      systemText += (systemText ? '\n\n' : '') + m.content;
      continue;
    }
    const role = m.role === 'assistant' ? 'model' : 'user';
    const last = contents[contents.length - 1];
    if (last?.role === role) {
      last.parts[0].text += `\n\n${m.content}`;
    } else {
      contents.push({ role, parts: [{ text: m.content }] });
    }
  }

  if (contents.length > 0 && contents[0].role !== 'user') {
    contents.unshift({ role: 'user', parts: [{ text: 'Xin chào.' }] });
    contents.splice(1, 0, {
      role: 'model',
      parts: [{ text: 'Xin chào! Tôi có thể giúp gì cho bạn?' }],
    });
  }

  return { systemText, contents };
}

/**
 * @param {Array<{ role: 'system' | 'user' | 'assistant'; content: string }>} messages
 * @param {{ temperature?: number; max_tokens?: number }} opts
 */
export async function geminiChat(messages, opts = {}) {
  const key = getGeminiApiKey();
  if (!key) {
    const err = new Error('Chưa cấu hình GOOGLE_GENERATIVE_AI_API_KEY trên server');
    err.code = 'GEMINI_NOT_CONFIGURED';
    throw err;
  }

  const { systemText, contents } = toGeminiPayload(messages);
  if (contents.length === 0) {
    const err = new Error('Không có tin nhắn hợp lệ cho Gemini');
    err.code = 'GEMINI_EMPTY';
    throw err;
  }

  const body = {
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.max_tokens ?? 1200,
    },
  };
  if (systemText) {
    body.systemInstruction = { parts: [{ text: systemText }] };
  }

  const url = `${API_BASE}/models/${encodeURIComponent(model())}:generateContent`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const raw =
      data?.error?.message ||
      data?.error?.status ||
      `${res.status} ${res.statusText}`;
    const msg = redactSecrets(typeof raw === 'string' ? raw : 'Gemini lỗi không xác định');
    const err = new Error(msg);
    err.code = 'GEMINI_HTTP';
    err.status = res.status;
    throw err;
  }

  const parts = data?.candidates?.[0]?.content?.parts;
  const text = parts
    ?.map((p) => (typeof p?.text === 'string' ? p.text : ''))
    .join('')
    .trim();

  if (!text) {
    const block = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason;
    const err = new Error(
      block ? `Gemini không trả nội dung (${block})` : 'Gemini không trả nội dung hợp lệ',
    );
    err.code = 'GEMINI_EMPTY';
    throw err;
  }

  return text;
}
