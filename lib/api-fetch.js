'use client';

import { getSupabase } from './supabase';

/**
 * Supabase 인증 토큰을 자동으로 포함하는 fetch 래퍼
 */
export async function authFetch(url, options = {}) {
  const { data: { session } } = await getSupabase().auth.getSession();
  const token = session?.access_token;

  const headers = {
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
}
