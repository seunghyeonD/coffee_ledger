import { getSupabaseAdmin } from './supabase-admin';

/**
 * API 라우트에서 인증된 유저를 검증하고 기업 소속 여부를 확인합니다.
 * @param {Request} request - Next.js Request 객체
 * @param {string} companyId - 확인할 기업 ID
 * @param {Object} options
 * @param {string[]} [options.roles] - 허용할 역할 목록 (예: ['master', 'admin'])
 * @returns {{ user, membership, error }}
 */
export async function verifyAuth(request, companyId, options = {}) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const supabase = getSupabaseAdmin();
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return { error: Response.json({ error: 'Invalid token' }, { status: 401 }) };
  }

  // companyId가 없으면 유저 인증만 확인
  if (!companyId) {
    return { user };
  }

  // 기업 소속 확인
  const { data: membership, error: ucError } = await supabase
    .from('user_companies')
    .select('user_id, role')
    .eq('user_id', user.id)
    .eq('company_id', companyId)
    .maybeSingle();

  if (ucError || !membership) {
    return { error: Response.json({ error: 'Forbidden: not a member of this company' }, { status: 403 }) };
  }

  // 역할 확인
  if (options.roles && !options.roles.includes(membership.role)) {
    return { error: Response.json({ error: 'Forbidden: insufficient role' }, { status: 403 }) };
  }

  return { user, membership };
}

/**
 * 문자열 입력값 검증
 */
export function validateString(value, name, maxLength = 500) {
  if (typeof value !== 'string') {
    return `${name} must be a string`;
  }
  if (value.length > maxLength) {
    return `${name} exceeds maximum length of ${maxLength}`;
  }
  return null;
}

/**
 * UUID 형식 검증
 */
export function isValidUUID(str) {
  return typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}
