import type { ChatMessage } from './healthStorage';

export type ChatTurn = {
  /** id tin user mở đầu đoạn (hoặc tin assistant nếu mồ côi) */
  id: string;
  user: ChatMessage;
  replies: ChatMessage[];
  ts: number;
};

export type ChatDayGroup = {
  dateKey: string;
  label: string;
  messages: ChatMessage[];
};

export type ChatDayTurnGroup = {
  dateKey: string;
  label: string;
  turns: ChatTurn[];
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

/** Một đoạn = câu hỏi user + (các) phản hồi assistant liền sau cho đến user tiếp theo */
export function groupChatByTurn(messages: ChatMessage[]): ChatTurn[] {
  const sorted = [...messages].sort((a, b) => a.ts - b.ts);
  const turns: ChatTurn[] = [];
  let current: ChatTurn | null = null;

  for (const m of sorted) {
    if (m.role === 'user') {
      if (current) turns.push(current);
      current = { id: m.id, user: m, replies: [], ts: m.ts };
    } else if (current) {
      current.replies.push(m);
    } else {
      turns.push({ id: m.id, user: m, replies: [], ts: m.ts });
    }
  }
  if (current) turns.push(current);
  return turns;
}

export function groupTurnsByDay(turns: ChatTurn[]): ChatDayTurnGroup[] {
  const map = new Map<string, ChatTurn[]>();
  for (const t of turns) {
    const key = dayKey(t.ts);
    const list = map.get(key) ?? [];
    list.push(t);
    map.set(key, list);
  }
  return [...map.entries()].map(([dateKey, dayTurns]) => ({
    dateKey,
    label: dayLabel(dayTurns[0]!.ts),
    turns: dayTurns,
  }));
}

export function turnPreview(turn: ChatTurn, max = 56): string {
  const base = turn.user.role === 'user' ? turn.user.content : turn.replies[0]?.content ?? turn.user.content;
  return previewChatLine(base, max);
}

export function turnMessageIds(turn: ChatTurn): string[] {
  return [turn.user.id, ...turn.replies.map((r) => r.id)];
}

export function removeMessageById(messages: ChatMessage[], messageId: string): ChatMessage[] {
  return messages.filter((m) => m.id !== messageId);
}

/** Xóa cả đoạn hội thoại (user + phản hồi AI liền kề) */
export function removeTurnById(messages: ChatMessage[], turnId: string): ChatMessage[] {
  const turn = groupChatByTurn(messages).find((t) => t.id === turnId);
  if (!turn) return messages;
  const drop = new Set(turnMessageIds(turn));
  return messages.filter((m) => !drop.has(m.id));
}
