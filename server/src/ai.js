import { geminiChat, geminiChatStream, isGeminiConfigured } from './gemini.js';

export { isGeminiConfigured as isAiConfigured };

/** @returns {'gemini' | null} */
export function aiProvider() {
  return isGeminiConfigured() ? 'gemini' : null;
}

/**
 * @param {Array<{ role: 'system' | 'user' | 'assistant'; content: string }>} messages
 * @param {{ temperature?: number; max_tokens?: number }} opts
 */
export async function aiChat(messages, opts = {}) {
  return geminiChat(messages, opts);
}

/** @returns {AsyncGenerator<string>} */
export function aiChatStream(messages, opts = {}) {
  return geminiChatStream(messages, opts);
}
