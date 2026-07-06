import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Production config loaded from Vite environment variables (.env)
// For local testing, mock fallbacks are assigned to avoid runtime crashes.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyHealthFlowBypassForLocalDev",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "healthflow-ai-apex.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "healthflow-ai-apex",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "healthflow-ai-apex.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789012",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789012:web:abcdef123456"
};

// Check if Firebase is running with dummy values
export const IS_MOCK_ENV = firebaseConfig.apiKey.includes("DummyKey");

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
