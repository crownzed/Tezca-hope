/**
 * Luồng chat: (1) phân loại tối ưu → (2) template hoặc gọi LLM.
 */
import { aiChat, aiChatStream } from './ai.js';
import { buildChatPayload, resolveChatIntent } from './chatIntent.js';
import { polishAiText } from './polishAiText.js';

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
 * @param {{ systemBase: string; messages: Array<{ role: string; content: string }>; plan: ReturnType<typeof planChatTurn> }}
 */
export async function runChatTurn({ systemBase, messages, plan }) {
  if (plan.mode === 'instant') {
    return {
      content: polishAiText(plan.content ?? ''),
      intent: plan.intent,
      source: 'classified',
    };
  }

  // Compress messages before sending to LLM
  const compressed = trimChatMessages(messages);
  const payload = buildChatPayload(systemBase, compressed, plan.intentMeta);
  const reply = await aiChat(payload, plan.intentMeta.opts);
  return {
    content: polishAiText(reply),
    intent: plan.intent,
    source: 'llm',
  };
}

/**
 * @param {{ systemBase: string; messages: Array<{ role: string; content: string }>; plan: ReturnType<typeof planChatTurn>; send: (obj: object) => void }}
 */
export async function runChatTurnStream({ systemBase, messages, plan, send }) {
  send({ intent: plan.intent, source: plan.mode === 'instant' ? 'classified' : 'llm' });

  if (plan.mode === 'instant') {
    const content = polishAiText(plan.content ?? '');
    send({ delta: content });
    send({ done: true, content, intent: plan.intent, source: 'classified' });
    return;
  }

  // Compress messages before sending to LLM
  const compressed = trimChatMessages(messages);
  const payload = buildChatPayload(systemBase, compressed, plan.intentMeta);
  let raw = '';
  for await (const delta of aiChatStream(payload, plan.intentMeta.opts)) {
    raw += delta;
    send({ delta });
  }
  const content = polishAiText(raw);
  send({ done: true, content, intent: plan.intent, source: 'llm' });
}
