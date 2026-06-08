// Firebase configuration - Tezca Hope
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSy…w7qM",
  authDomain: "tezca-f4608.firebaseapp.com",
  databaseURL: "https://tezca-f4608-default-rtdb.firebaseio.com",
  projectId: "tezca-f4608",
  storageBucket: "tezca-f4608.firebasestorage.app",
  messagingSenderId: "367101667137",
  appId: "1:367101667137:web:9b2e7c10cda0050f6523c0",
  measurementId: "G-BFP6XVEJSF"
};

// Khởi tạo Firebase
export const app = initializeApp(firebaseConfig);

// Realtime Database - lưu trữ bài viết và tin nhắn
export const db = getDatabase(app);

// Analytics (chỉ chạy trên browser)
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;
