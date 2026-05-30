export type MoodOption = {
  key: string;
  label: string;
  emoji: string;
  /** 1–5 — dùng cho biểu đồ và cảnh báo chuyên gia */
  score: number;
};

/** Biểu cảm nhật ký cảm xúc — chọn nhanh, không cần ghi chú */
export const MOOD_OPTIONS: MoodOption[] = [
  { key: 'ecstatic', label: 'Tuyệt vời', emoji: '🤩', score: 5 },
  { key: 'happy', label: 'Vui vẻ', emoji: '😄', score: 5 },
  { key: 'grateful', label: 'Biết ơn', emoji: '🥰', score: 5 },
  { key: 'calm', label: 'Bình an', emoji: '😌', score: 4 },
  { key: 'okay', label: 'Ổn', emoji: '🙂', score: 4 },
  { key: 'hopeful', label: 'Hy vọng', emoji: '🌤️', score: 4 },
  { key: 'neutral', label: 'Bình thường', emoji: '😐', score: 3 },
  { key: 'tired', label: 'Mệt mỏi', emoji: '😴', score: 3 },
  { key: 'confused', label: 'Bối rối', emoji: '😕', score: 3 },
  { key: 'stressed', label: 'Căng thẳng', emoji: '😣', score: 2 },
  { key: 'anxious', label: 'Lo âu', emoji: '😰', score: 2 },
  { key: 'sad', label: 'Buồn', emoji: '😢', score: 2 },
  { key: 'lonely', label: 'Cô đơn', emoji: '🥺', score: 2 },
  { key: 'angry', label: 'Bực bội', emoji: '😠', score: 1 },
  { key: 'overwhelmed', label: 'Quá tải', emoji: '😵‍💫', score: 1 },
  { key: 'hopeless', label: 'Rất khó', emoji: '😞', score: 1 },
];

export const DEFAULT_MOOD = MOOD_OPTIONS.find((m) => m.key === 'neutral') ?? MOOD_OPTIONS[6];

export function findMoodOption(input: { key?: string; label?: string; emoji?: string }): MoodOption | undefined {
  if (input.key) {
    const byKey = MOOD_OPTIONS.find((m) => m.key === input.key);
    if (byKey) return byKey;
  }
  if (input.emoji) {
    const byEmoji = MOOD_OPTIONS.find((m) => m.emoji === input.emoji);
    if (byEmoji) return byEmoji;
  }
  if (input.label) {
    return MOOD_OPTIONS.find((m) => m.label === input.label);
  }
  return undefined;
}

export function moodDisplay(entry: { moodLabel: string; moodEmoji?: string; moodScore?: number }) {
  const matched =
    findMoodOption({ label: entry.moodLabel, emoji: entry.moodEmoji }) ??
    MOOD_OPTIONS.find((m) => m.score === entry.moodScore);
  return {
    emoji: entry.moodEmoji || matched?.emoji || '😐',
    label: entry.moodLabel || matched?.label || '—',
  };
}
