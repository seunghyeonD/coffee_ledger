import { createClient } from '@supabase/supabase-js';

let _supabase = null;

export function getSupabase() {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || url === 'YOUR_SUPABASE_URL' || !key || key === 'YOUR_SUPABASE_ANON_KEY') {
      throw new Error('Supabase 설정이 필요합니다. .env.local 파일을 확인해주세요.');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}
