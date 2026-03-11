'use client';

import { getFCMMessaging, getToken, onMessage } from './firebase';
import { getSupabase } from './supabase';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export async function requestNotificationPermission(userId, companyId) {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const messaging = getFCMMessaging();
  if (!messaging) return null;

  const token = await getToken(messaging, { vapidKey: VAPID_KEY });
  if (!token) return null;

  // Upsert token to Supabase
  await getSupabase().from('fcm_tokens').upsert(
    { user_id: userId, company_id: companyId, token },
    { onConflict: 'user_id,token' }
  );

  return token;
}

export async function unregisterFCMToken(userId) {
  const messaging = getFCMMessaging();
  if (!messaging) return;

  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      await getSupabase().from('fcm_tokens').delete()
        .eq('user_id', userId).eq('token', token);
    }
  } catch (e) {
    console.error('FCM token unregister failed:', e);
  }
}

export function setupForegroundListener(callback) {
  const messaging = getFCMMessaging();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    const { title, body } = payload.notification || {};
    if (callback) callback(title, body);
  });
}

export async function getNotificationPreferences(userId, companyId) {
  const { data } = await getSupabase().from('notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .single();
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
