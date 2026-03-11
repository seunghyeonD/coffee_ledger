'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';
import { setupForegroundListener } from '@/lib/fcm';

export default function FCMInitializer({ showToast }) {
  const { user } = useAuth();
  const { companyId, loaded } = useStore();

  useEffect(() => {
    // 서비스 워커 등록
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!user || !companyId || !loaded) return;

    // 포그라운드 메시지 리스너
    const unsubscribe = setupForegroundListener((title, body) => {
      if (showToast) showToast(`${title}: ${body}`);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user, companyId, loaded, showToast]);

  return null;
}
