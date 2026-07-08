import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Production config loaded from Vite environment variables (.env)
// For local testing, mock fallbacks are assigned to avoid runtime crashes.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyANHKWs1xftg5CyC0GoWGvGIXcMgJkpJhc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "healthflow-ai-1aac3.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "healthflow-ai-1aac3",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "healthflow-ai-1aac3.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "664468255655",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:664468255655:web:201f6f5b9700caa13efc82"
};

// Check if Firebase is running with dummy values
export const IS_MOCK_ENV = firebaseConfig.apiKey.includes("DummyKey");

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
