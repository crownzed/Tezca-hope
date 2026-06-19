import { geminiChat, geminiChatStream, geminiJSON, isGeminiConfigured, pingGemini } from './gemini.js';

export { isGeminiConfigured as isAiConfigured };
export { pingGemini as pingAi };

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

/**
 * Sinh JSON có cấu trúc qua structured output (A2).
 * @param {{ system?: string; user: string; schema: object; model?: string;
 *   temperature?: number; max_tokens?: number; retries?: number }} args
 * @returns {Promise<any>}
 */
export async function aiJSON(args) {
  return geminiJSON(args);
}
