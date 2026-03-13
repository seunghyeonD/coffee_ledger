import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyAuth, validateString, isValidUUID } from '@/lib/api-auth';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');

  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
  }

  if (!isValidUUID(companyId)) {
    return NextResponse.json({ error: 'Invalid companyId format' }, { status: 400 });
  }

  // 인증 + 기업 소속 확인
  const { error: authError } = await verifyAuth(request, companyId);
  if (authError) return authError;

  const supabase = getSupabaseAdmin();

  const { data: ucData, error: ucError } = await supabase
    .from('user_companies')
    .select('user_id, role, name')
    .eq('company_id', companyId);

  if (ucError) {
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });
  }

  const members = await Promise.all(
    (ucData || []).map(async (uc) => {
      const { data: userData } = await supabase.auth.admin.getUserById(uc.user_id);
      return {
        userId: uc.user_id,
        email: userData?.user?.email || uc.user_id,
        role: uc.role,
        name: uc.name || '',
      };
    })
  );

  return NextResponse.json(members);
}

// 유저 이름 수정
export async function PATCH(request) {
  const body = await request.json();
  const { companyId, userId, name } = body;

  if (!companyId || !userId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!isValidUUID(companyId) || !isValidUUID(userId)) {
    return NextResponse.json({ error: 'Invalid parameter format' }, { status: 400 });
  }

  if (name !== undefined) {
    const nameErr = validateString(name, 'name', 100);
    if (nameErr) {
      return NextResponse.json({ error: nameErr }, { status: 400 });
    }
  }

  // 인증 + 관리자 권한 확인
  const { error: authError } = await verifyAuth(request, companyId, { roles: ['master', 'admin'] });
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('user_companies')
    .update({ name: name || '' })
    .eq('user_id', userId)
    .eq('company_id', companyId);

  if (error) {
    return NextResponse.json({ error: 'Failed to update name' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// 유저 기업에서 제거
export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  const userId = searchParams.get('userId');

  if (!companyId || !userId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!isValidUUID(companyId) || !isValidUUID(userId)) {
    return NextResponse.json({ error: 'Invalid parameter format' }, { status: 400 });
  }

  // 인증 + 관리자 권한 확인
  const { error: authError } = await verifyAuth(request, companyId, { roles: ['master', 'admin'] });
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('user_companies')
    .delete()
    .eq('user_id', userId)
    .eq('company_id', companyId);

  if (error) {
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }

  // FCM 토큰, 알림 설정도 정리
  await supabase.from('fcm_tokens').delete().eq('user_id', userId).eq('company_id', companyId);
  await supabase.from('notification_preferences').delete().eq('user_id', userId).eq('company_id', companyId);

  return NextResponse.json({ success: true });
}
