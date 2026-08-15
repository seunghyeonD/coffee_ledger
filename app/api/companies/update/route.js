import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyAuth, validateString, isValidUUID } from '@/lib/api-auth';

// 기업 정보 수정 (입금계좌 등) — master/admin 전용
export async function PATCH(request) {
  const body = await request.json();
  const { companyId, bankAccount } = body;

  if (!companyId || !isValidUUID(companyId)) {
    return NextResponse.json({ error: 'Invalid companyId' }, { status: 400 });
  }

  if (bankAccount !== null && bankAccount !== undefined) {
    const err = validateString(bankAccount, 'bankAccount', 60);
    if (err) {
      return NextResponse.json({ error: err }, { status: 400 });
    }
  }

  const { error: authError } = await verifyAuth(request, companyId, { roles: ['master', 'admin'] });
  if (authError) return authError;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('companies')
    .update({ bank_account: bankAccount?.trim() || null })
    .eq('id', companyId);

  if (error) {
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
