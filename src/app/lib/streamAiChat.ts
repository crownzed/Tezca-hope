import { apiBase, apiUrl } from './api';
import { polishAiText } from './polishAiText';

export type StreamAiChatOptions = {
  token: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  /** Gọi mỗi khi có thêm ký tự (đã nối delta) */
  onDelta: (displayText: string) => void;
  signal?: AbortSignal;
};

/**
 * Gọi POST /api/me/ai-chat/stream (SSE). Trả nội dung đã polish.
 * Ném lỗi nếu stream thất bại — caller có thể fallback JSON.
 */
export async function streamAiChat({
  token,
  messages,
  onDelta,
  signal,
}: StreamAiChatOptions): Promise<string> {
  const urls = apiBase()
    ? [apiUrl('/api/me/ai-chat/stream'), '/api/me/ai-chat/stream']
    : [apiUrl('/api/me/ai-chat/stream')];
  let lastRes: Response | null = null;

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ messages }),
        signal,
      });
      if (!res.ok) {
        lastRes = res;
        if (res.status === 404 || res.status === 405) continue;
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `${res.status} ${res.statusText}`);
      }
      if (!res.body) throw new Error('Không nhận được luồng phản hồi');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';
      let raw = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sseBuffer += decoder.decode(value, { stream: true });

        let boundary = sseBuffer.indexOf('\n\n');
        while (boundary !== -1) {
          const block = sseBuffer.slice(0, boundary);
          sseBuffer = sseBuffer.slice(boundary + 2);

          for (const line of block.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload) continue;
            let data: { delta?: string; done?: boolean; content?: string; error?: string };
            try {
              data = JSON.parse(payload) as typeof data;
            } catch {
              continue;
            }
            if (data.error) throw new Error(data.error);
            if (typeof data.delta === 'string' && data.delta) {
              raw += data.delta;
              onDelta(raw);
            }
            if (data.done && typeof data.content === 'string') {
              const finalText = polishAiText(data.content);
              onDelta(finalText);
              return finalText;
            }
          }

          boundary = sseBuffer.indexOf('\n\n');
        }
      }

      const finalText = polishAiText(raw);
      if (!finalText) throw new Error('AI không trả nội dung');
      onDelta(finalText);
      return finalText;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e;
      if (base === bases[bases.length - 1]) throw e;
    }
  }

  if (lastRes) {
    const err = (await lastRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `${lastRes.status} ${lastRes.statusText}`);
  }
  throw new Error('Không kết nối được stream AI');
}

/** Mô phỏng gõ dần (demo / offline) */
export async function simulateTextStream(
  fullText: string,
  onDelta: (text: string) => void,
  opts?: { signal?: AbortSignal; minMs?: number; maxMs?: number },
): Promise<string> {
  const polished = polishAiText(fullText);
  const tokens = polished.match(/\S+\s*|\s+/g) ?? [polished];
  let acc = '';
  const minMs = opts?.minMs ?? 14;
  const maxMs = opts?.maxMs ?? 32;

  for (const token of tokens) {
    if (opts?.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    acc += token;
    onDelta(acc);
    await new Promise((r) => setTimeout(r, minMs + Math.random() * (maxMs - minMs)));
  }
  return polished;
}
