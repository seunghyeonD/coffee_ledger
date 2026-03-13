'use client';

import { getSupabase } from './supabase';
import { authFetch } from './api-fetch';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// 사용자 버튼 클릭 시 호출 (권한 요청 포함)
export async function requestNotificationPermission(userId, companyId) {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  return saveFCMToken(userId, companyId);
}

// 이미 권한이 허용된 경우 토큰만 갱신 (자동 호출용)
export async function refreshFCMToken(userId, companyId) {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  return saveFCMToken(userId, companyId);
}

async function saveFCMToken(userId, companyId) {
  try {
    const { getFCMMessaging, getFCMToken } = await import('./firebase');
    const messaging = await getFCMMessaging();
    if (!messaging) return null;

    const token = await getFCMToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return null;

    const res = await authFetch('/api/fcm-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, companyId, token }),
    });
    if (!res.ok) {
      console.error('FCM token save failed:', await res.text());
    }

    return token;
  } catch (e) {
    console.error('FCM token save failed:', e);
    return null;
  }
}

export async function disableFCMToken(userId, companyId) {
  try {
    await authFetch('/api/fcm-token', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, companyId, enabled: false }),
    });
  } catch (e) {
    console.error('FCM token disable failed:', e);
  }
}

export async function setupForegroundListener(callback) {
  try {
    const { getFCMMessaging, onFCMMessage } = await import('./firebase');
    const messaging = await getFCMMessaging();
    if (!messaging) return () => {};

    return onFCMMessage(messaging, (payload) => {
      const { title, body } = payload.notification || {};
      if (callback) callback(title, body);
    });
  } catch {
    return () => {};
  }
}

export async function getNotificationPreferences(userId, companyId) {
  const { data } = await getSupabase().from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .maybeSingle();
  return data;
}

export async function getFCMTokenStatus(userId, companyId) {
  const res = await authFetch(`/api/fcm-token?userId=${userId}&companyId=${companyId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function upsertNotificationPreferences(userId, companyId, prefs) {
  const { data, error } = await getSupabase().from('notification_preferences')
    .upsert(
      { user_id: userId, company_id: companyId, ...prefs },
      { onConflict: 'user_id,company_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return data;
}
