import { initializeApp, getApps } from 'firebase/app';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getApp() {
  if (!firebaseConfig.apiKey) return null;
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

export async function getFCMMessaging() {
  if (typeof window === 'undefined') return null;
  const app = getApp();
  if (!app) return null;
  try {
    const { getMessaging } = await import('firebase/messaging');
    return getMessaging(app);
  } catch {
    return null;
  }
}

export async function getFCMToken(messaging, options) {
  const { getToken } = await import('firebase/messaging');
  return getToken(messaging, options);
}

export async function onFCMMessage(messaging, callback) {
  const { onMessage } = await import('firebase/messaging');
  return onMessage(messaging, callback);
}
