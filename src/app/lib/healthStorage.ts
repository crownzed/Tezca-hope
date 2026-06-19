import { apiFetch } from './api';
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

function storageKey(base: string, userId: string | null | undefined): string {
  return userId ? `${base}_${userId}` : base;
}

function storageFor(userId: string | null | undefined): Storage {
  return userId ? localStorage : sessionStorage;
}

function normalizeDate(date: unknown): string {
  const raw = String(date || '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : new Date().toISOString().slice(0, 10);
}

export function getCurrentCustomerUserId(): string | null {
  try {
    const raw = localStorage.getItem('tezca_customer_user');
    if (!raw) return null;
    return (JSON.parse(raw) as { id?: string }).id ?? null;
  } catch {
    return null;
  }
}
const BMI_KEY = 'tezca_bmi_entries_v1';
const MOOD_KEY = 'tezca_mood_entries_v1';
/** @deprecated — chỉ dùng để migrate sang key theo user */
const CHAT_KEY_LEGACY = 'tezca_ai_chat_v1';
const CHAT_KEY_PREFIX = 'tezca_ai_chat_user_v1';
const EXPERT_CHAT_KEY = 'tezca_expert_chat_v1';

function readJson<T>(key: string, fallback: T, storage: Storage = localStorage): T {
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown, storage: Storage = localStorage) {
  storage.setItem(key, JSON.stringify(value));
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

function normalizeBmiEntries(entries: unknown): BmiEntry[] {
  const list = Array.isArray(entries) ? entries : [];
  return list
    .map((entry, index) => {
      const heightCm = Number(entry?.heightCm) || 0;
      const weightKg = Number(entry?.weightKg) || 0;
      const date = normalizeDate(entry?.date);
      const bmiValue = Number(entry?.bmi);
      const bmi = Number.isFinite(bmiValue) && bmiValue > 0 ? Math.round(bmiValue * 10) / 10 : calcBmi(heightCm, weightKg);
      return {
        id: String(entry?.id || `${date}-${heightCm}-${weightKg}-${index}`),
        date,
        heightCm,
        weightKg,
        bmi,
      };
    })
    .filter((entry) => entry.heightCm > 0 && entry.weightKg > 0 && entry.bmi > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function normalizeMoodEntries(entries: unknown): MoodEntry[] {
  const list = Array.isArray(entries) ? entries : [];
  return list
    .map((entry, index) => {
      const date = normalizeDate(entry?.date);
      const score = Math.max(1, Math.min(5, Number(entry?.moodScore) || 0));
      const moodLabel = String(entry?.moodLabel || '').trim() || '—';
      return {
        id: String(entry?.id || `${date}-${index}`),
        date,
        moodLabel,
        moodScore: score,
        moodEmoji: entry?.moodEmoji,
        moodKey: entry?.moodKey,
        note: entry?.note,
        freeText: String(entry?.freeText ?? entry?.note ?? '').trim(),
      };
    })
    .filter((entry) => entry.moodLabel !== '—')
    .sort((a, b) => b.date.localeCompare(a.date));
}

function promoteGuestHealthData(userId: string): void {
  const bmiAccountKey = storageKey(BMI_KEY, userId);
  const moodAccountKey = storageKey(MOOD_KEY, userId);
  if (localStorage.getItem(bmiAccountKey) == null) {
    const guestBmi = sessionStorage.getItem(BMI_KEY);
    if (guestBmi) {
      localStorage.setItem(bmiAccountKey, guestBmi);
      sessionStorage.removeItem(BMI_KEY);
    }
  }
  if (localStorage.getItem(moodAccountKey) == null) {
    const guestMood = sessionStorage.getItem(MOOD_KEY);
    if (guestMood) {
      localStorage.setItem(moodAccountKey, guestMood);
      sessionStorage.removeItem(MOOD_KEY);
    }
  }
}

export function clearGuestHealthCache(): void {
  sessionStorage.removeItem(BMI_KEY);
  sessionStorage.removeItem(MOOD_KEY);
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


export function loadBmiEntries(userId?: string | null): BmiEntry[] {
  if (userId) promoteGuestHealthData(userId);
  const storage = storageFor(userId);
  return normalizeBmiEntries(readJson<BmiEntry[]>(storageKey(BMI_KEY, userId), [], storage));
}

export function saveBmiEntries(entries: BmiEntry[], userId?: string | null) {
  const storage = storageFor(userId);
  writeJson(storageKey(BMI_KEY, userId), normalizeBmiEntries(entries), storage);
}

export function loadMoodEntries(userId?: string | null): MoodEntry[] {
  if (userId) promoteGuestHealthData(userId);
  const storage = storageFor(userId);
  return normalizeMoodEntries(readJson<MoodEntry[]>(storageKey(MOOD_KEY, userId), [], storage));
}

export function saveMoodEntries(entries: MoodEntry[], userId?: string | null) {
  const storage = storageFor(userId);
  writeJson(storageKey(MOOD_KEY, userId), normalizeMoodEntries(entries), storage);
}

type PendingHealthSync = {
  bmi: BmiEntry[];
  mood: MoodEntry[];
};

const HEALTH_SYNC_PENDING_PREFIX = 'tezca_health_pending_v1';

function pendingHealthKey(userId: string): string {
  return `${HEALTH_SYNC_PENDING_PREFIX}_${userId}`;
}

function readPendingHealthSync(userId: string): PendingHealthSync {
  return readJson<PendingHealthSync>(pendingHealthKey(userId), { bmi: [], mood: [] });
}

function writePendingHealthSync(userId: string, pending: PendingHealthSync) {
  writeJson(pendingHealthKey(userId), {
    bmi: normalizeBmiEntries(pending.bmi),
    mood: normalizeMoodEntries(pending.mood),
  });
}

function upsertByDate<T extends { date: string }>(items: T[], item: T): T[] {
  return [...items.filter((row) => row.date !== item.date), item].sort((a, b) => b.date.localeCompare(a.date));
}

function removeByDate<T extends { date: string }>(items: T[], date: string): T[] {
  return items.filter((row) => row.date !== date);
}

async function postBmiEntry(token: string, entry: BmiEntry): Promise<void> {
  await apiFetch('/api/me/bmi', {
    method: 'POST',
    token,
    body: JSON.stringify({
      date: entry.date,
      heightCm: entry.heightCm,
      weightKg: entry.weightKg,
      bmi: entry.bmi,
    }),
  });
}

async function postMoodEntry(token: string, entry: MoodEntry): Promise<void> {
  await apiFetch('/api/me/moods', {
    method: 'POST',
    token,
    body: JSON.stringify({
      date: entry.date,
      moodLabel: entry.moodLabel,
      moodScore: entry.moodScore,
      moodEmoji: entry.moodEmoji,
      moodKey: entry.moodKey,
      freeText: entry.freeText ?? entry.note ?? '',
    }),
  });
}

export function queuePendingBmiEntry(userId: string, entry: BmiEntry) {
  const pending = readPendingHealthSync(userId);
  writePendingHealthSync(userId, { ...pending, bmi: upsertByDate(pending.bmi, entry) });
}

export function queuePendingMoodEntry(userId: string, entry: MoodEntry) {
  const pending = readPendingHealthSync(userId);
  writePendingHealthSync(userId, { ...pending, mood: upsertByDate(pending.mood, entry) });
}

export async function syncBmiEntry(userId: string, token: string, entry: BmiEntry): Promise<boolean> {
  try {
    await postBmiEntry(token, entry);
    const pending = readPendingHealthSync(userId);
    writePendingHealthSync(userId, { ...pending, bmi: removeByDate(pending.bmi, entry.date) });
    return true;
  } catch {
    queuePendingBmiEntry(userId, entry);
    return false;
  }
}

export async function syncMoodEntry(userId: string, token: string, entry: MoodEntry): Promise<boolean> {
  try {
    await postMoodEntry(token, entry);
    const pending = readPendingHealthSync(userId);
    writePendingHealthSync(userId, { ...pending, mood: removeByDate(pending.mood, entry.date) });
    return true;
  } catch {
    queuePendingMoodEntry(userId, entry);
    return false;
  }
}

export async function flushPendingHealthSync(userId: string, token: string): Promise<void> {
  const pending = readPendingHealthSync(userId);
  let remainingBmi = pending.bmi;
  let remainingMood = pending.mood;

  for (const entry of pending.bmi) {
    try {
      await postBmiEntry(token, entry);
      remainingBmi = removeByDate(remainingBmi, entry.date);
    } catch {
      /* giữ hàng đợi */
    }
  }

  for (const entry of pending.mood) {
    try {
      await postMoodEntry(token, entry);
      remainingMood = removeByDate(remainingMood, entry.date);
    } catch {
      /* giữ hàng đợi */
    }
  }

  writePendingHealthSync(userId, { bmi: remainingBmi, mood: remainingMood });
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
