'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/lib/store';

export default function FCMInitializer({ showToast }) {
  const { user } = useAuth();
  const { companyId, loaded } = useStore();
  const showToastRef = useRef(showToast);
  const initialized = useRef(false);
  showToastRef.current = showToast;

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!user || !companyId || !loaded || initialized.current) return;
    initialized.current = true;

    import('@/lib/fcm').then(async ({ refreshFCMToken, setupForegroundListener }) => {
      // 이미 권한 허용된 경우에만 토큰 자동 갱신 (권한 요청 팝업 없음)
      await refreshFCMToken(user.id, companyId);

      // 포그라운드 메시지 리스너
      const unsub = await setupForegroundListener((title, body) => {
        if (showToastRef.current) showToastRef.current(`${title}: ${body}`);
      });
      return unsub;
    }).catch(() => {});
  }, [user, companyId, loaded]);

  return null;
}
