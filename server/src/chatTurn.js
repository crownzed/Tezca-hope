/**
 * Luồng chat: (1) phân loại tối ưu → (2) template hoặc gọi LLM.
 */
import { aiChat, aiChatStream } from './ai.js';
import { buildChatPayload, resolveChatIntent } from './chatIntent.js';
import { polishAiText } from './polishAiText.js';

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

  const payload = buildChatPayload(systemBase, messages, plan.intentMeta);
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

  const payload = buildChatPayload(systemBase, messages, plan.intentMeta);
  let raw = '';
  for await (const delta of aiChatStream(payload, plan.intentMeta.opts)) {
    raw += delta;
    send({ delta });
  }
  const content = polishAiText(raw);
  send({ done: true, content, intent: plan.intent, source: 'llm' });
}
