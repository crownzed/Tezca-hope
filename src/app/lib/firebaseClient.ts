import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';

/** Cấu hình web từ Firebase Console (public — không dùng cho quyền ghi Firestore). */
function readFirebaseWebConfig() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) return null;

  return {
    apiKey,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  };
}

let analyticsInstance: Analytics | null = null;

/**
 * Khởi tạo Firebase Web (Analytics). Cộng đồng vẫn qua API server + Firestore Admin — không dùng RTDB/databaseURL.
 */
export function initFirebaseClient(): FirebaseApp | null {
  const config = readFirebaseWebConfig();
  if (!config) return null;

  const app = getApps().length > 0 ? getApps()[0]! : initializeApp(config);

  if (typeof window !== 'undefined' && !analyticsInstance) {
    void isSupported().then((supported) => {
      if (supported) analyticsInstance = getAnalytics(app);
    });
  }

  return app;
}

export function isFirebaseWebConfigured(): boolean {
  return Boolean(readFirebaseWebConfig());
}
