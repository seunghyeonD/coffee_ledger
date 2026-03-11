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

    import('@/lib/fcm').then(async ({ requestNotificationPermission, setupForegroundListener }) => {
      // 자동으로 알림 권한 요청 + 토큰 저장
      await requestNotificationPermission(user.id, companyId);

      // 포그라운드 메시지 리스너
      const unsub = await setupForegroundListener((title, body) => {
        if (showToast) showToast(`${title}: ${body}`);
      });
      unsubscribe = unsub;
    }).catch(() => {});

    return () => unsubscribe();
  }, [user, companyId, loaded, showToast]);

  return null;
}
