/**
 * Cache hồ sơ khách hàng trong localStorage.
 * Dùng làm backup khi SQLite trên Vercel bị reset (cold start).
 */

const PROFILE_KEY = (userId: string) => `tezca_profile_${userId}`;
const HEALTH_KEY = (userId: string) => `tezca_health_${userId}`;

function safeWrite(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function safeRead<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

export type CachedProfile = {
  fullName: string;
  gender: string;
  dob: string;
  phone: string;
  address: string;
  notes: string;
};

export type CachedHealthProfile = {
  currentConditions: string;
  medicalHistory: string;
  allergies: string;
  medications: string;
  contraindications: string;
};

export function saveProfileCache(userId: string, profile: CachedProfile) {
  if (!userId) return;
  safeWrite(PROFILE_KEY(userId), profile);
}

export function loadProfileCache(userId: string): CachedProfile | null {
  if (!userId) return null;
  return safeRead<CachedProfile>(PROFILE_KEY(userId));
}

export function clearProfileCache(userId: string) {
  if (!userId) return;
  safeRemove(PROFILE_KEY(userId));
}

export function isProfileCacheComplete(p: CachedProfile | null): boolean {
  if (!p) return false;
  return Boolean(p.fullName?.trim() && p.dob?.trim() && p.gender?.trim() && p.phone?.trim());
}

export function saveHealthCache(userId: string, profile: CachedHealthProfile) {
  if (!userId) return;
  safeWrite(HEALTH_KEY(userId), profile);
}

export function loadHealthCache(userId: string): CachedHealthProfile | null {
  if (!userId) return null;
  return safeRead<CachedHealthProfile>(HEALTH_KEY(userId));
}
