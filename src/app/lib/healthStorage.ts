export type BmiEntry = {
  id: string;
  date: string;
  heightCm: number;
  weightKg: number;
  bmi: number;
};

export type MoodEntry = {
  id: string;
  date: string;
  moodLabel: string;
  moodScore: number;
  moodEmoji?: string;
  moodKey?: string;
  /** @deprecated — không còn dùng trên UI */
  note?: string;
  freeText?: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: number;
};

const BMI_KEY = 'tezca_bmi_entries_v1';
const MOOD_KEY = 'tezca_mood_entries_v1';
/** @deprecated — chỉ dùng để migrate sang key theo user */
const CHAT_KEY_LEGACY = 'tezca_ai_chat_v1';
const CHAT_KEY_PREFIX = 'tezca_ai_chat_user_v1';
const EXPERT_CHAT_KEY = 'tezca_expert_chat_v1';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function calcBmi(heightCm: number, weightKg: number): number {
  const hCm = Number(heightCm);
  const wKg = Number(weightKg);
  if (!Number.isFinite(hCm) || !Number.isFinite(wKg) || hCm <= 0 || wKg <= 0) return 0;
  const h = hCm / 100;
  const raw = wKg / (h * h);
  if (!Number.isFinite(raw)) return 0;
  return Math.round(raw * 10) / 10;
}

/** WHO (kg/m²): gầy &lt;18.5 · bình thường 18.5–24.9 · thừa cân 25–29.9 · béo phì ≥30 */
export function bmiCategory(bmi: number): string {
  if (!Number.isFinite(bmi) || bmi <= 0) return '—';
  if (bmi < 18.5) return 'Thiếu cân';
  if (bmi < 25) return 'Bình thường';
  if (bmi < 30) return 'Thừa cân';
  return 'Béo phì';
}

/** Khoảng cân nặng gợi ý (BMI 18.5–24.9) cho chiều cao hiện tại — chỉ mang tính tham khảo. */
export function idealWeightRangeKg(heightCm: number): { min: number; max: number } | null {
  const hCm = Number(heightCm);
  if (!Number.isFinite(hCm) || hCm <= 0) return null;
  const h = hCm / 100;
  const min = Math.round(18.5 * h * h * 10) / 10;
  const max = Math.round(24.9 * h * h * 10) / 10;
  return { min, max };
}


export function loadBmiEntries(): BmiEntry[] {
  return readJson<BmiEntry[]>(BMI_KEY, []);
}

export function saveBmiEntries(entries: BmiEntry[]) {
  writeJson(BMI_KEY, entries);
}

export function loadMoodEntries(): MoodEntry[] {
  return readJson<MoodEntry[]>(MOOD_KEY, []);
}

export function saveMoodEntries(entries: MoodEntry[]) {
  writeJson(MOOD_KEY, entries);
}

export function aiChatStorageKey(userId: string | null | undefined): string | null {
  if (!userId) return null;
  return `${CHAT_KEY_PREFIX}_${userId}`;
}

/** Chỉ đọc cache khi đã đăng nhập (có userId). Khách: luôn []. */
export function loadAiChatForUser(userId: string | null | undefined): ChatMessage[] {
  const key = aiChatStorageKey(userId);
  if (!key) return [];
  return readJson<ChatMessage[]>(key, []);
}

export function saveAiChatForUser(userId: string | null | undefined, messages: ChatMessage[]) {
  const key = aiChatStorageKey(userId);
  if (!key) return;
  writeJson(key, messages);
}

/** Migrate dữ liệu chat cũ (một key chung) sang key theo user — gọi một lần sau đăng nhập. */
export function migrateLegacyAiChat(userId: string): ChatMessage[] {
  const key = aiChatStorageKey(userId);
  if (!key) return [];
  const existing = readJson<ChatMessage[]>(key, []);
  if (existing.length > 0) return existing;
  const legacy = readJson<ChatMessage[]>(CHAT_KEY_LEGACY, []);
  if (legacy.length > 0) {
    writeJson(key, legacy);
    try {
      localStorage.removeItem(CHAT_KEY_LEGACY);
    } catch {
      /* ignore */
    }
    return legacy;
  }
  return [];
}

/** @param userId — nếu có, đọc cache theo tài khoản; không có = không lưu khách */
export function loadAiChat(userId?: string | null): ChatMessage[] {
  if (!userId) return [];
  return loadAiChatForUser(userId);
}

/** @deprecated Dùng saveAiChatForUser — không ghi khi chưa đăng nhập */
export function saveAiChat(messages: ChatMessage[], userId?: string | null) {
  saveAiChatForUser(userId ?? null, messages);
}

export function loadExpertChat(): ChatMessage[] {
  return readJson<ChatMessage[]>(EXPERT_CHAT_KEY, []);
}

export function saveExpertChat(messages: ChatMessage[]) {
  writeJson(EXPERT_CHAT_KEY, messages);
}
