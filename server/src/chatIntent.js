/**
 * Phân loại câu hỏi chat AI — đọc tình huống từ server/data/chat-scenarios.json
 */
export {
  normalizeVi,
  classifyFromScenarios as classifyChatIntent,
  resolveChatIntent,
  loadChatScenariosConfig,
  getChatScenarioRuntime,
  resetChatScenariosCache,
} from './loadChatScenarios.js';

export { getClassifierCacheSize } from './chatClassifier.js';

/**
 * @param {string} systemBase
 * @param {Array<{ role: string; content: string }>} messages
 * @param {{ systemAddon: string }} intent
 */
export function buildChatPayload(systemBase, messages, intent) {
  const system = intent.systemAddon
    ? `${systemBase}\n\n${intent.systemAddon}`
    : systemBase;
  return [{ role: 'system', content: system }, ...messages];
}

/**
 * @param {Array<{ role: string; content: string }>} messages
 */
export function getLastUserMessage(messages) {
  if (!Array.isArray(messages)) return '';
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role === 'user' && typeof m.content === 'string') return m.content;
  }
  return '';
}
