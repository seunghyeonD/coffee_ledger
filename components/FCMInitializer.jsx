'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';

export default function FCMInitializer({ showToast }) {
  const { user } = useAuth();
  const { companyId, loaded } = useStore();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!user || !companyId || !loaded) return;

    let unsubscribe = () => {};

    import('@/lib/fcm').then(({ setupForegroundListener }) => {
      setupForegroundListener((title, body) => {
        if (showToast) showToast(`${title}: ${body}`);
      }).then(unsub => {
        unsubscribe = unsub;
      });
    }).catch(() => {});

    return () => unsubscribe();
  }, [user, companyId, loaded, showToast]);

  return null;
}
