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

/**
 * Trích text từ một chunk SSE Gemini.
 * @param {unknown} data
 */
function textFromStreamChunk(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((p) => (typeof p?.text === 'string' ? p.text : ''))
    .join('');
}

/**
 * Stream nội dung — mỗi lần yield là đoạn delta cần nối thêm.
 * @param {Array<{ role: 'system' | 'user' | 'assistant'; content: string }>} messages
 * @param {{ temperature?: number; max_tokens?: number }} opts
 * @returns {AsyncGenerator<string>}
 */
export async function* geminiChatStream(messages, opts = {}) {
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
      topP: 0.92,
    },
  };
  if (systemText) {
    body.systemInstruction = { parts: [{ text: systemText }] };
  }

  const url = `${API_BASE}/models/${encodeURIComponent(model())}:streamGenerateContent?alt=sse`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
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

  if (!res.body) {
    const err = new Error('Gemini không trả luồng dữ liệu');
    err.code = 'GEMINI_EMPTY';
    throw err;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = '';
  let accumulated = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    sseBuffer += decoder.decode(value, { stream: true });

    let boundary = sseBuffer.indexOf('\n\n');
    while (boundary !== -1) {
      const eventBlock = sseBuffer.slice(0, boundary);
      sseBuffer = sseBuffer.slice(boundary + 2);

      for (const line of eventBlock.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        let parsed;
        try {
          parsed = JSON.parse(payload);
        } catch {
          continue;
        }
        const chunkText = textFromStreamChunk(parsed);
        if (!chunkText) continue;

        let delta = chunkText;
        if (chunkText.startsWith(accumulated)) {
          delta = chunkText.slice(accumulated.length);
          accumulated = chunkText;
        } else {
          accumulated += chunkText;
        }
        if (delta) yield delta;
      }

      boundary = sseBuffer.indexOf('\n\n');
    }
  }

  if (!accumulated.trim()) {
    const err = new Error('Gemini không trả nội dung hợp lệ');
    err.code = 'GEMINI_EMPTY';
    throw err;
  }
}
