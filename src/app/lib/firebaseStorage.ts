// Firebase Realtime Database - lưu trữ dữ liệu người dùng đã đăng nhập
import { ref, set, get, child } from 'firebase/database';
import { db } from './firebase';

/** Lưu dữ liệu vào Firebase cho user đã đăng nhập */
export async function firebaseSave(userId: string, path: string, data: unknown): Promise<void> {
  try {
    const dbRef = ref(db, `users/${userId}/${path}`);
    await set(dbRef, data);
  } catch (err) {
    console.warn('[Firebase] Lưu thất bại:', path, err);
  }
}

/** Đọc dữ liệu từ Firebase cho user đã đăng nhập */
export async function firebaseLoad<T>(userId: string, path: string): Promise<T | null> {
  try {
    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, `users/${userId}/${path}`));
    if (snapshot.exists()) {
      return snapshot.val() as T;
    }
    return null;
  } catch (err) {
    console.warn('[Firebase] Đọc thất bại:', path, err);
    return null;
  }
}

/** Sync toàn bộ discipline data lên Firebase */
export async function firebaseSyncDisciplineData(
  userId: string,
  data: {
    exercises?: unknown;
    dailyProgress?: unknown;
    foodLog?: unknown;
  },
): Promise<void> {
  const promises: Promise<void>[] = [];
  if (data.exercises !== undefined) {
    promises.push(firebaseSave(userId, 'discipline/exercises', data.exercises));
  }
  if (data.dailyProgress !== undefined) {
    promises.push(firebaseSave(userId, 'discipline/dailyProgress', data.dailyProgress));
  }
  if (data.foodLog !== undefined) {
    promises.push(firebaseSave(userId, 'discipline/foodLog', data.foodLog));
  }
  await Promise.all(promises);
}

/** Load toàn bộ discipline data từ Firebase */
export async function firebaseLoadDisciplineData(userId: string): Promise<{
  exercises: unknown | null;
  dailyProgress: unknown | null;
  foodLog: unknown | null;
}> {
  const [exercises, dailyProgress, foodLog] = await Promise.all([
    firebaseLoad(userId, 'discipline/exercises'),
    firebaseLoad(userId, 'discipline/dailyProgress'),
    firebaseLoad(userId, 'discipline/foodLog'),
  ]);
  return { exercises, dailyProgress, foodLog };
}
