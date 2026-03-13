import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyAuth, validateString, isValidUUID } from '@/lib/api-auth';

// FCM 토큰 상태 조회
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const companyId = searchParams.get('companyId');

    if (!userId || !companyId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!isValidUUID(userId) || !isValidUUID(companyId)) {
      return Response.json({ error: 'Invalid parameter format' }, { status: 400 });
    }

    // 인증 + 기업 소속 확인 (본인의 토큰 상태만 조회 가능)
    const { user, error } = await verifyAuth(request, companyId);
    if (error) return error;
    if (user.id !== userId) {
      return Response.json({ error: 'Forbidden: can only check own token status' }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from('fcm_tokens')
      .select('enabled')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .limit(1)
      .maybeSingle();

    return Response.json({ exists: !!data, enabled: data?.enabled ?? false });
  } catch (error) {
    console.error('FCM token status error:', error);
    return Response.json({ error: 'Failed to get status' }, { status: 500 });
  }
}

// FCM 토큰 등록 (enabled: true)
export async function POST(request) {
  try {
    const { userId, companyId, token } = await request.json();

    if (!userId || !companyId || !token) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!isValidUUID(userId) || !isValidUUID(companyId)) {
      return Response.json({ error: 'Invalid parameter format' }, { status: 400 });
    }

    const tokenErr = validateString(token, 'token', 500);
    if (tokenErr) {
      return Response.json({ error: tokenErr }, { status: 400 });
    }

    // 인증 + 기업 소속 확인 (본인의 토큰만 등록 가능)
    const { user, error: authError } = await verifyAuth(request, companyId);
    if (authError) return authError;
    if (user.id !== userId) {
      return Response.json({ error: 'Forbidden: can only register own token' }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();

    // 같은 유저+기업의 기존 토큰 삭제 후 새 토큰 등록 (중복 방지)
    await supabase.from('fcm_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('company_id', companyId);

    const { error } = await supabase.from('fcm_tokens').insert(
      { user_id: userId, company_id: companyId, token, enabled: true }
    );

    if (error) {
      console.error('FCM token insert error:', error);
      return Response.json({ error: 'Failed to register token' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('FCM token register error:', error);
    return Response.json({ error: 'Failed to register token' }, { status: 500 });
  }
}

// FCM 토큰 enabled 상태 변경
export async function PATCH(request) {
  try {
    const { userId, companyId, enabled } = await request.json();

    if (!userId || !companyId || enabled === undefined) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!isValidUUID(userId) || !isValidUUID(companyId)) {
      return Response.json({ error: 'Invalid parameter format' }, { status: 400 });
    }

    if (typeof enabled !== 'boolean') {
      return Response.json({ error: 'enabled must be a boolean' }, { status: 400 });
    }

    // 인증 + 기업 소속 확인 (본인의 토큰만 변경 가능)
    const { user, error: authError } = await verifyAuth(request, companyId);
    if (authError) return authError;
    if (user.id !== userId) {
      return Response.json({ error: 'Forbidden: can only modify own token' }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('fcm_tokens')
      .update({ enabled })
      .eq('user_id', userId)
      .eq('company_id', companyId);

    if (error) {
      console.error('FCM token update error:', error);
      return Response.json({ error: 'Failed to update token' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('FCM token toggle error:', error);
    return Response.json({ error: 'Failed to update token' }, { status: 500 });
  }
}

// FCM 토큰 삭제
export async function DELETE(request) {
  try {
    const { userId, token } = await request.json();

    if (!userId || !token) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!isValidUUID(userId)) {
      return Response.json({ error: 'Invalid parameter format' }, { status: 400 });
    }

    const tokenErr = validateString(token, 'token', 500);
    if (tokenErr) {
      return Response.json({ error: tokenErr }, { status: 400 });
    }

    // 인증 확인 (본인의 토큰만 삭제 가능)
    const { user, error: authError } = await verifyAuth(request, null);
    if (authError) return authError;
    if (user.id !== userId) {
      return Response.json({ error: 'Forbidden: can only delete own token' }, { status: 403 });
    }

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('fcm_tokens').delete()
      .eq('user_id', userId)
      .eq('token', token);

    if (error) {
      console.error('FCM token delete error:', error);
      return Response.json({ error: 'Failed to unregister token' }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('FCM token unregister error:', error);
    return Response.json({ error: 'Failed to unregister token' }, { status: 500 });
  }
}
