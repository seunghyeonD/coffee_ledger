import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');

  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: ucData, error: ucError } = await supabase
    .from('user_companies')
    .select('user_id, role, name')
    .eq('company_id', companyId);

  if (ucError) {
    return NextResponse.json({ error: ucError.message }, { status: 500 });
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

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('user_companies')
    .update({ name: name || '' })
    .eq('user_id', userId)
    .eq('company_id', companyId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('user_companies')
    .delete()
    .eq('user_id', userId)
    .eq('company_id', companyId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // FCM 토큰, 알림 설정도 정리
  await supabase.from('fcm_tokens').delete().eq('user_id', userId).eq('company_id', companyId);
  await supabase.from('notification_preferences').delete().eq('user_id', userId).eq('company_id', companyId);

  return NextResponse.json({ success: true });
}
