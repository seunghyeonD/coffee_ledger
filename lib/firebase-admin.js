import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

let _messaging = null;

export function getAdminMessaging() {
  if (_messaging) return _messaging;

  const app = getApps().length === 0
    ? initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
          clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      })
    : getApps()[0];

  _messaging = getMessaging(app);
  return _messaging;
}
