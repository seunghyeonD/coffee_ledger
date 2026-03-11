'use client';

import { getSupabase } from './supabase';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export async function requestNotificationPermission(userId, companyId) {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  try {
    const { getFCMMessaging, getFCMToken } = await import('./firebase');
    const messaging = await getFCMMessaging();
    if (!messaging) return null;

    const token = await getFCMToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return null;

    await getSupabase().from('fcm_tokens').upsert(
      { user_id: userId, company_id: companyId, token },
      { onConflict: 'user_id,token' }
    );

    return token;
  } catch (e) {
    console.error('FCM permission request failed:', e);
    return null;
  }
}

export async function unregisterFCMToken(userId) {
  try {
    const { getFCMMessaging, getFCMToken } = await import('./firebase');
    const messaging = await getFCMMessaging();
    if (!messaging) return;

    const token = await getFCMToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      await getSupabase().from('fcm_tokens').delete()
        .eq('user_id', userId).eq('token', token);
    }
  } catch (e) {
    console.error('FCM token unregister failed:', e);
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
