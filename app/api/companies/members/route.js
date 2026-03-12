import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');

  if (!companyId) {
    return NextResponse.json({ error: 'companyId is required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // user_companies에서 해당 기업의 멤버 목록 조회
  const { data: ucData, error: ucError } = await supabase
    .from('user_companies')
    .select('user_id, role')
    .eq('company_id', companyId);

  if (ucError) {
    return NextResponse.json({ error: ucError.message }, { status: 500 });
  }

  // auth.users에서 이메일 조회
  const members = await Promise.all(
    (ucData || []).map(async (uc) => {
      const { data: userData } = await supabase.auth.admin.getUserById(uc.user_id);
      return {
        userId: uc.user_id,
        email: userData?.user?.email || uc.user_id,
        role: uc.role,
      };
    })
  );

  return NextResponse.json(members);
}
