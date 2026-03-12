'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';

export default function FCMInitializer({ showToast }) {
  const { user } = useAuth();
  const { companyId, loaded } = useStore();
  const showToastRef = useRef(showToast);
  showToastRef.current = showToast;

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!user || !companyId || !loaded) return;

    // 이미 알림 권한이 허용된 경우에만 토큰 자동 갱신
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    let unsubscribe = () => {};

    import('@/lib/fcm').then(async ({ requestNotificationPermission, setupForegroundListener }) => {
      // 권한이 이미 허용된 상태이므로 토큰만 갱신 (permission 요청 팝업 없음)
      await requestNotificationPermission(user.id, companyId);

      // 포그라운드 메시지 리스너
      const unsub = await setupForegroundListener((title, body) => {
        if (showToastRef.current) showToastRef.current(`${title}: ${body}`);
      });
      unsubscribe = unsub;
    }).catch(() => {});

    return () => unsubscribe();
  }, [user, companyId, loaded]);

  return null;
}
