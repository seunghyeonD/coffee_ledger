import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyAuth, validateString } from '@/lib/api-auth';

// 초대 코드로 기업 참여 — 코드가 일치하는 기업만 반환하므로
// companies 테이블을 공개 조회로 열어둘 필요가 없다
export async function POST(request) {
  try {
    const { inviteCode } = await request.json();

    if (!inviteCode) {
      return Response.json({ error: 'Missing inviteCode' }, { status: 400 });
    }

    const codeErr = validateString(inviteCode, 'inviteCode', 20);
    if (codeErr) {
      return Response.json({ error: codeErr }, { status: 400 });
    }

    const { user, error: authError } = await verifyAuth(request, null);
    if (authError) return authError;

    const supabase = getSupabaseAdmin();
    const code = inviteCode.trim().toUpperCase();

    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('invite_code', code)
      .maybeSingle();

    if (!company) {
      return Response.json({ error: 'invalid_code' }, { status: 404 });
    }

    // 이미 소속된 경우 기존 역할 그대로 반환
    const { data: existing } = await supabase
      .from('user_companies')
      .select('role')
      .eq('user_id', user.id)
      .eq('company_id', company.id)
      .maybeSingle();

    if (existing) {
      return Response.json({ company, role: existing.role, alreadyMember: true });
    }

    const displayName = user.user_metadata?.display_name || '';
    const { error: joinError } = await supabase
      .from('user_companies')
      .insert({ user_id: user.id, company_id: company.id, role: 'user', name: displayName });

    if (joinError) {
      console.error('Join insert error:', joinError);
      return Response.json({ error: 'Failed to join company' }, { status: 500 });
    }

    return Response.json({ company, role: 'user', alreadyMember: false });
  } catch (error) {
    console.error('Company join error:', error);
    return Response.json({ error: 'Failed to join company' }, { status: 500 });
  }
}
