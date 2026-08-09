import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyAuth, validateString, isValidUUID } from '@/lib/api-auth';
import { sendNotificationEmails } from '@/lib/email';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  try {
    const { companyId, memberName, email } = await request.json();

    if (!companyId || !memberName || !email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!isValidUUID(companyId)) {
      return Response.json({ error: 'Invalid companyId format' }, { status: 400 });
    }

    const nameErr = validateString(memberName, 'memberName', 100);
    if (nameErr) return Response.json({ error: nameErr }, { status: 400 });

    const emailErr = validateString(email, 'email', 200);
    if (emailErr) return Response.json({ error: emailErr }, { status: 400 });
    if (!EMAIL_RE.test(email.trim())) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // 인증 + 기업 소속 확인 (초대는 관리자만)
    const { error: authError } = await verifyAuth(request, companyId, { roles: ['master', 'admin'] });
    if (authError) return authError;

    const supabase = getSupabaseAdmin();
    const targetEmail = email.trim().toLowerCase();

    // 이 기업에 해당 이메일 계정이 이미 있으면 초대 불필요
    const { data: ucData } = await supabase
      .from('user_companies')
      .select('user_id')
      .eq('company_id', companyId);

    const users = await Promise.all(
      (ucData || []).map(uc => supabase.auth.admin.getUserById(uc.user_id).catch(() => null))
    );
    const alreadyMember = users.some(u => u?.data?.user?.email?.toLowerCase() === targetEmail);

    if (alreadyMember) {
      return Response.json({ invited: false, reason: 'already_member' });
    }

    const { data: company } = await supabase
      .from('companies')
      .select('name, invite_code')
      .eq('id', companyId)
      .single();

    if (!company) {
      return Response.json({ error: 'Company not found' }, { status: 404 });
    }

    const origin = request.headers.get('origin') || 'https://coffeeledger.co.kr';
    const title = `'${company.name}' 커피 대장부 초대`;
    const body = `${String(memberName)}님, '${company.name}' 커피 대장부에 초대되었습니다.\n\n아래 주소에서 회원가입 후 초대 코드를 입력하면 참여할 수 있습니다.\n\n초대 코드: ${company.invite_code}\n주소: ${origin}`;

    const emailed = await sendNotificationEmails([targetEmail], title, body, { companyId, type: 'invite' });

    return Response.json({ invited: emailed > 0 });
  } catch (error) {
    console.error('Member invite error:', error);
    return Response.json({ error: 'Failed to send invite' }, { status: 500 });
  }
}
