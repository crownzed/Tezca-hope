/**
 * Luồng chat: (1) phân loại tối ưu → (2) template hoặc gọi LLM.
 */
import { aiChat, aiChatStream } from './ai.js';
import { buildChatPayload, resolveChatIntent, getLastUserMessage } from './chatIntent.js';
import { polishAiText } from './polishAiText.js';
import { moderateChatInput, moderateAiOutput } from './contentModeration.js';
import { classifyScope, needsExpertEscalation, escalationReply, detectPromptInjection, scoreResponseTrust, trustFallbackReply } from './chatGuards.js';

// ============================================================================
// Token Compression Helpers
// ============================================================================

/**
 * Estimate tokens (rough: 1 token ≈ 4 chars for Vietnamese)
 */
export function estimateTokens(messages) {
  const text = Array.isArray(messages)
    ? messages.map(m => m.content || '').join(' ')
    : String(messages || '');
  return Math.ceil(text.length / 4);
}

/**
 * Compress JSON by removing null/undefined/empty fields
 */
export function compressJSON(obj) {
  return JSON.parse(JSON.stringify(obj, (k, v) => {
    if (v === null || v === undefined) return undefined;
    if (Array.isArray(v) && v.length === 0) return undefined;
    if (typeof v === 'object' && v && Object.keys(v).length === 0) return undefined;
    return v;
  }));
}

/**
 * Summarize old messages by extracting topics
 */
function summarizeMessages(messages) {
  const topics = new Set();
  messages.forEach(m => {
    const content = (m.content || '').toLowerCase();
    if (content.includes('tập')) topics.add('tập luyện');
    if (content.includes('dinh dưỡng')) topics.add('dinh dưỡng');
    if (content.includes('bmi')) topics.add('chỉ số BMI');
    if (content.includes('chuyên gia')) topics.add('chọn chuyên gia');
    if (content.includes('kế hoạch')) topics.add('lập kế hoạch');
  });
  return Array.from(topics).join(', ') || 'thảo luận chung';
}

/**
 * Trim chat messages with smart compression
 * - Keep system messages
 * - Keep recent 20 messages
 * - Summarize older messages
 */
export function trimChatMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return [];

  const system = messages.filter(m => m.role === 'system');
  const nonSystem = messages.filter(m => m.role !== 'system');

  // If within budget, return all
  const totalTokens = estimateTokens(messages);
  if (totalTokens < 4000) {
    return messages;
  }

  // Keep recent 20 messages
  const recent = nonSystem.slice(-20);

  // Compress older messages into summary
  const older = nonSystem.slice(0, -20);
  if (older.length > 0) {
    const summary = {
      role: 'system',
      content: `[Lịch sử trước (${older.length} tin nhắn): ${summarizeMessages(older)}]`
    };
    const compressed = [...system, summary, ...recent];
    
    // Log compression ratio
    const before = estimateTokens(messages);
    const after = estimateTokens(compressed);
    const saved = before - after;
    const ratio = ((saved / before) * 100).toFixed(1);
    console.log(`[Token] chat-history: ${before} → ${after} tokens (saved ${saved}, ${ratio}%)`);
    
    return compressed;
  }

  return [...system, ...recent];
}

/**
 * Bước 1 — một lần resolve (cache LRU + token index).
 * @param {string} lastUserText
 */
export function planChatTurn(lastUserText) {
  const raw = String(lastUserText || '').trim();
  const resolved = resolveChatIntent(raw);

  if (!raw) {
    return {
      intent: resolved.kind,
      mode: 'instant',
      content: resolved.reply ?? '',
    };
  }

  if (resolved.mode === 'instant') {
    return {
      intent: resolved.kind,
      mode: 'instant',
      content: resolved.reply ?? '',
    };
  }

  return {
    intent: resolved.kind,
    mode: 'llm',
    intentMeta: {
      kind: resolved.kind,
      systemAddon: resolved.systemAddon,
      opts: resolved.opts,
    },
  };
}

/**
 * Chạy chuỗi guard INPUT theo thứ tự: moderation → scope (A) → escalation (C).
 * Trả về { reply, source } nếu phải chặn/định tuyến; null nếu cho qua LLM.
 * @param {string} lastUserText
 * @param {{ expert?: { name?: string }|null }} ctx
 */
function runInputGuards(lastUserText, { expert = null } = {}) {
  // 1) Moderation (an toàn) — ưu tiên cao nhất.
  const gate = moderateChatInput(lastUserText);
  if (gate.blocked) {
    return { reply: gate.reply, source: 'moderation', intent: 'moderation' };
  }
  // D) Anti prompt-injection — chống thao túng chỉ thị hệ thống.
  const inj = detectPromptInjection(lastUserText);
  if (inj.injected) {
    return { reply: inj.reply, source: 'injection', intent: 'injection' };
  }
  // C) Escalation — câu hỏi vượt mức giáo dục → hướng tới chuyên gia.
  const esc = needsExpertEscalation(lastUserText);
  if (esc.escalate) {
    return { reply: escalationReply(esc.reason, expert), source: 'escalation', intent: 'escalation' };
  }
  // A) Scope — chủ đề ngoài phạm vi sức khỏe.
  const scope = classifyScope(lastUserText);
  if (!scope.inScope) {
    return { reply: scope.reply, source: 'scope', intent: `out_of_scope:${scope.category}` };
  }
  return null;
}

/**
 * @param {{ systemBase: string; messages: Array<{ role: string; content: string }>; plan: ReturnType<typeof planChatTurn>; grounding?: string; expert?: { name?: string }|null }}
 */
export async function runChatTurn({ systemBase, messages, plan, grounding = '', expert = null }) {
  const guard = runInputGuards(getLastUserMessage(messages), { expert });
  if (guard) {
    return { content: polishAiText(guard.reply), intent: guard.intent, source: guard.source };
  }

  if (plan.mode === 'instant') {
    return {
      content: polishAiText(plan.content ?? ''),
      intent: plan.intent,
      source: 'classified',
    };
  }

  // B) Grounding — bơm dữ liệu thật của người dùng vào system prompt.
  const sys = grounding ? `${systemBase}\n\n${grounding}` : systemBase;
  // Compress messages before sending to LLM
  const compressed = trimChatMessages(messages);
  const payload = buildChatPayload(sys, compressed, plan.intentMeta);
  const reply = await aiChat(payload, plan.intentMeta.opts);
  const checked = moderateAiOutput(polishAiText(reply));
  // E) Trust check — output yếu/lảng tránh → fallback an toàn.
  if (checked.safe) {
    const trust = scoreResponseTrust(checked.reply);
    if (!trust.trusted) {
      return { content: polishAiText(trustFallbackReply(expert)), intent: plan.intent, source: 'fallback' };
    }
  }
  return {
    content: checked.reply,
    intent: plan.intent,
    source: 'llm',
  };
}

/**
 * @param {{ systemBase: string; messages: Array<{ role: string; content: string }>; plan: ReturnType<typeof planChatTurn>; send: (obj: object) => void; grounding?: string; expert?: { name?: string }|null }}
 */
export async function runChatTurnStream({ systemBase, messages, plan, send, grounding = '', expert = null, signal = null }) {
  const guard = runInputGuards(getLastUserMessage(messages), { expert });
  if (guard) {
    const content = polishAiText(guard.reply);
    send({ intent: guard.intent, source: guard.source });
    send({ delta: content });
    send({ done: true, content, intent: guard.intent, source: guard.source });
    return;
  }

  send({ intent: plan.intent, source: plan.mode === 'instant' ? 'classified' : 'llm' });

  if (plan.mode === 'instant') {
    const content = polishAiText(plan.content ?? '');
    send({ delta: content });
    send({ done: true, content, intent: plan.intent, source: 'classified' });
    return;
  }

  // B) Grounding — bơm dữ liệu thật của người dùng vào system prompt.
  const sys = grounding ? `${systemBase}\n\n${grounding}` : systemBase;
  // Compress messages before sending to LLM
  const compressed = trimChatMessages(messages);
  const payload = buildChatPayload(sys, compressed, plan.intentMeta);

  // Streaming có KIỂM DUYỆT SỚM theo ranh giới câu: gồn delta vào buffer,
  // chỉ flush khi gặp kết câu (. ! ? \n) và sau khi moderate toàn bộ text tích
  // lũy đạt. Nếu phát hiện vi phạm mạnh → dừng ngay, thay câu an toàn →
  // KHÔNG bao giờ để lộ câu đã bị cờ ra người dùng.
  let raw = '';        // toàn bộ đã nhận từ model
  let flushed = '';    // phần đã gửi cho người dùng (đã qua moderation)
  let pending = '';    // phần chờ đủ câu để kiểm
  const BOUNDARY = /[.!?\n…]/;

  const streamOpts = signal ? { ...plan.intentMeta.opts, signal } : plan.intentMeta.opts;
  for await (const delta of aiChatStream(payload, streamOpts)) {
    raw += delta;
    pending += delta;
    // Chỉ kiểm khi có ranh giới câu trong pending (tránh moderate mỗi token).
    if (!BOUNDARY.test(delta)) continue;
    const check = moderateAiOutput(raw);
    if (!check.safe) {
      // Vi phạm mạnh → bỏ toàn bộ, thay bằng câu an toàn.
      send({ done: true, content: check.reply, intent: plan.intent, source: 'moderation' });
      return;
    }
    // An toàn tới thời điểm này → flush phần pending.
    send({ delta: pending });
    flushed += pending;
    pending = '';
  }

  // Kiểm duyệt lần cuối toàn bộ (bắt phần pending dư + an toàn tổng thể).
  const checked = moderateAiOutput(polishAiText(raw));
  if (!checked.safe) {
    send({ done: true, content: checked.reply, intent: plan.intent, source: 'moderation' });
    return;
  }
  // E) Trust check — output yếu/lảng tránh → fallback an toàn.
  const trust = scoreResponseTrust(checked.reply);
  if (!trust.trusted) {
    const content = polishAiText(trustFallbackReply(expert));
    send({ done: true, content, intent: plan.intent, source: 'fallback' });
    return;
  }
  // done.content = bản polish hoàn chỉnh (frontend lấy làm văn bản cuối,
  // đồng bộ với phần đã flush + pending còn lại).
  send({ done: true, content: checked.reply, intent: plan.intent, source: 'llm' });
}
