import type { ChatMessage } from './healthStorage';

export type ChatDayGroup = {
  dateKey: string;
  label: string;
  messages: ChatMessage[];
};

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dayLabel(ts: number): string {
  try {
    const d = new Date(ts);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - target.getTime()) / 86400000);
    if (diff === 0) return 'Hôm nay';
    if (diff === 1) return 'Hôm qua';
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    }).format(d);
  } catch {
    return '';
  }
}

export function groupChatByDay(messages: ChatMessage[]): ChatDayGroup[] {
  const sorted = [...messages].sort((a, b) => a.ts - b.ts);
  const map = new Map<string, ChatMessage[]>();
  for (const m of sorted) {
    const key = dayKey(m.ts);
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  }
  return [...map.entries()].map(([dateKey, msgs]) => ({
    dateKey,
    label: dayLabel(msgs[0]!.ts),
    messages: msgs,
  }));
}

export function previewChatLine(content: string, max = 56): string {
  const one = content.replace(/\s+/g, ' ').trim();
  if (one.length <= max) return one;
  return `${one.slice(0, max - 1)}…`;
}
