import { getSupabaseAdmin } from '@/lib/supabase-admin';

// FCM 토큰 등록
export async function POST(request) {
  try {
    const { userId, companyId, token } = await request.json();

    if (!userId || !companyId || !token) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('fcm_tokens').upsert(
      { user_id: userId, company_id: companyId, token },
      { onConflict: 'user_id,token' }
    );

    if (error) {
      console.error('FCM token upsert error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('FCM token register error:', error);
    return Response.json({ error: 'Failed to register token' }, { status: 500 });
  }
}

// FCM 토큰 삭제
export async function DELETE(request) {
  try {
    const { userId, token } = await request.json();

    if (!userId || !token) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('fcm_tokens').delete()
      .eq('user_id', userId)
      .eq('token', token);

    if (error) {
      console.error('FCM token delete error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('FCM token unregister error:', error);
    return Response.json({ error: 'Failed to unregister token' }, { status: 500 });
  }
}
