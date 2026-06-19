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

/** Model dùng cho tác vụ độ chính xác cao (vd sinh kế hoạch sức khỏe).
 *  Mặc định cùng model chat để không tăng chi phí; chỉ nâng khi đặt env riêng. */
function qualityModel() {
  return (
    process.env.GOOGLE_GENERATIVE_AI_QUALITY_MODEL?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_MODEL?.trim() ||
    'gemini-2.5-flash'
  );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Timeout mặc định (ms) cho request Gemini. Override qua env. */
const CHAT_TIMEOUT_MS = Number(process.env.GEMINI_TIMEOUT_MS) || 30_000;
const STREAM_TIMEOUT_MS = Number(process.env.GEMINI_STREAM_TIMEOUT_MS) || 60_000;

/**
 * fetch có timeout + hỗ trợ AbortSignal từ caller.
 * Kết hợp signal ngoài (client ngắt) với timer nội bộ qua AbortController riêng;
 * abort khi BẤT KỲ nguồn nào kích hoạt. Luôn clear timer để tránh rò timer.
 * @param {string} url
 * @param {RequestInit} init
 * @param {{ timeoutMs?: number; signal?: AbortSignal }} ctl
 */
export async function fetchWithTimeout(url, init, { timeoutMs = CHAT_TIMEOUT_MS, signal } = {}) {
  const controller = new AbortController();
  const onAbort = () => controller.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  const timer = setTimeout(() => {
    const err = new Error('Gemini request timeout');
    err.code = 'GEMINI_TIMEOUT';
    controller.abort(err);
  }, timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    // Phân biệt timeout nội bộ với abort từ client.
    if (controller.signal.aborted) {
      const reason = controller.signal.reason;
      if (reason?.code === 'GEMINI_TIMEOUT') throw reason;
      const err = new Error('Yêu cầu bị hủy');
      err.code = 'GEMINI_ABORTED';
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

/** Lỗi tạm thời nên retry: 429 (rate limit) + 5xx (overloaded/internal). */
function isRetryableStatus(status) {
  return status === 429 || (status >= 500 && status < 600);
}

/**
 * Gọi Gemini generateContent với retry + backoff cho lỗi tạm thời.
 * @param {{ key: string; body: object; retries?: number; signal?: AbortSignal }} args
 */
async function callGenerateContent({ key, body, retries = 2, modelName, signal } = {}) {
  const url = `${API_BASE}/models/${encodeURIComponent(modelName || model())}:generateContent`;
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
      },
      { timeoutMs: CHAT_TIMEOUT_MS, signal },
    );
    const data = await res.json().catch(() => ({}));

    if (res.ok) return data;

    const raw =
      data?.error?.message ||
      data?.error?.status ||
      `${res.status} ${res.statusText}`;
    const msg = redactSecrets(typeof raw === 'string' ? raw : 'Gemini lỗi không xác định');
    lastErr = new Error(msg);
    lastErr.code = 'GEMINI_HTTP';
    lastErr.status = res.status;

    if (!isRetryableStatus(res.status) || attempt === retries) throw lastErr;
    // Backoff: 500ms, 1500ms
    await sleep(500 * (attempt + 1) * (attempt + 1));
  }

  throw lastErr;
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

  const data = await callGenerateContent({ key, body });

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
 * Sinh JSON có cấu trúc (structured output) qua responseSchema của Gemini.
 * Ép model trả đúng schema → không còn parse Markdown bằng regex.
 * @param {{ system?: string; user: string; schema: object; model?: string;
 *   temperature?: number; max_tokens?: number; retries?: number }} args
 * @returns {Promise<any>} object đã parse từ JSON
 */
export async function geminiJSON({
  system,
  user,
  schema,
  model: modelOverride,
  temperature = 0.5,
  max_tokens = 4000,
  retries = 2,
  signal,
} = {}) {
  const key = getGeminiApiKey();
  if (!key) {
    const err = new Error('Chưa cấu hình GOOGLE_GENERATIVE_AI_API_KEY trên server');
    err.code = 'GEMINI_NOT_CONFIGURED';
    throw err;
  }
  if (!user || typeof user !== 'string') {
    const err = new Error('Thiếu nội dung prompt cho Gemini');
    err.code = 'GEMINI_EMPTY';
    throw err;
  }

  const body = {
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: max_tokens,
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  };
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  const data = await callGenerateContent({
    key,
    body,
    retries,
    modelName: modelOverride || qualityModel(),
    signal,
  });

  const parts = data?.candidates?.[0]?.content?.parts;
  const raw = parts
    ?.map((p) => (typeof p?.text === 'string' ? p.text : ''))
    .join('')
    .trim();

  if (!raw) {
    const block = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason;
    const err = new Error(
      block ? `Gemini không trả nội dung (${block})` : 'Gemini không trả nội dung hợp lệ',
    );
    err.code = 'GEMINI_EMPTY';
    throw err;
  }

  try {
    return JSON.parse(raw);
  } catch {
    // Phòng trường hợp model bọc JSON trong ```json ... ``` hoặc thêm text
    const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* rơi xuống lỗi bên dưới */
      }
    }
    const err = new Error('Gemini trả JSON không hợp lệ');
    err.code = 'GEMINI_BAD_JSON';
    throw err;
  }
}
function textFromStreamChunk(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((p) => (typeof p?.text === 'string' ? p.text : ''))
    .join('');
}

/**
 * Ping Gemini thật bằng 1 request tối thiểu để xác nhận kết nối + key hợp lệ.
 * Trả { ok, status?, error? }. Không throw.
 */
export async function pingGemini() {
  const key = getGeminiApiKey();
  if (!key) return { ok: false, error: 'not_configured' };
  try {
    const data = await callGenerateContent({
      key,
      retries: 1,
      body: {
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        generationConfig: { maxOutputTokens: 1, temperature: 0 },
      },
    });
    // Phản hồi hợp lệ dù bị cắt vì maxOutputTokens=1
    const ok = Boolean(data?.candidates) || Boolean(data?.promptFeedback);
    return { ok };
  } catch (e) {
    return { ok: false, status: e?.status, error: e?.code || 'error' };
  }
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
  const signal = opts.signal;

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

  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': key,
      },
      body: JSON.stringify(body),
    },
    { timeoutMs: STREAM_TIMEOUT_MS, signal },
  );

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

  // Sau khi nhận headers, fetchWithTimeout đã clear timer + gỡ listener; nên
  // phần đọc body cần cơ chế hủy RIÊNG: (a) client/caller abort → cancel
  // reader ngay; (b) idle timeout giữa các chunk → tránh treo vô hạn.
  let aborted = false;
  let abortErr = null;
  const cancelReader = (err) => {
    aborted = true;
    abortErr = err;
    reader.cancel().catch(() => {});
  };
  const onCallerAbort = () => {
    const err = new Error('Yêu cầu bị hủy');
    err.code = 'GEMINI_ABORTED';
    cancelReader(err);
  };
  if (signal) {
    if (signal.aborted) onCallerAbort();
    else signal.addEventListener('abort', onCallerAbort, { once: true });
  }

  try {
    while (true) {
      // Idle timeout: nếu không nhận chunk nào trong STREAM_TIMEOUT_MS → hủy.
      let idleTimer;
      const idle = new Promise((_, reject) => {
        idleTimer = setTimeout(() => {
          const err = new Error('Gemini stream timeout');
          err.code = 'GEMINI_TIMEOUT';
          cancelReader(err);
          reject(err);
        }, STREAM_TIMEOUT_MS);
      });
      let result;
      try {
        result = await Promise.race([reader.read(), idle]);
      } finally {
        clearTimeout(idleTimer);
      }
      if (aborted) throw abortErr || new Error('Stream hủy');
      const { done, value } = result;
      if (done) break;
      sseBuffer += decoder.decode(value, { stream: true });
      sseBuffer = sseBuffer.replace(/\r\n/g, '\n');

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

    // Flush phần SSE còn dư sau khi stream done.
    if (sseBuffer.trim()) {
      for (const line of sseBuffer.split('\n')) {
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
    }
  } finally {
    if (signal) signal.removeEventListener('abort', onCallerAbort);
  }

  // Nếu bị hủy giữa chừng thì đã throw trong vòng lặp; tới đây là stream
  // kết thúc bình thường. Rỗng hoàn toàn → báo lỗi để route fallback.
  if (!accumulated.trim()) {
    const err = new Error('Gemini không trả nội dung hợp lệ');
    err.code = 'GEMINI_EMPTY';
    throw err;
  }
}
