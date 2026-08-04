import { getAdminMessaging } from '@/lib/firebase-admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyAuth, validateString, isValidUUID } from '@/lib/api-auth';
import { getUserEmails, sendNotificationEmails } from '@/lib/email';

export async function POST(request) {
  try {
    const { companyId, memberName, balance, autoTriggered } = await request.json();

    if (!companyId || !memberName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!isValidUUID(companyId)) {
      return Response.json({ error: 'Invalid companyId format' }, { status: 400 });
    }

    const nameErr = validateString(memberName, 'memberName', 100);
    if (nameErr) {
      return Response.json({ error: nameErr }, { status: 400 });
    }

    if (balance !== undefined && (typeof balance !== 'number' || !isFinite(balance))) {
      return Response.json({ error: 'balance must be a finite number' }, { status: 400 });
    }

    if (autoTriggered !== undefined && typeof autoTriggered !== 'boolean') {
      return Response.json({ error: 'autoTriggered must be a boolean' }, { status: 400 });
    }

    // 인증 + 기업 소속 확인
    const { error: authError } = await verifyAuth(request, companyId);
    if (authError) return authError;

    const supabase = getSupabaseAdmin();

    // user_companies에서 name이 memberName을 포함하거나 일치하는 유저 찾기
    const { data: ucData } = await supabase
      .from('user_companies')
      .select('user_id, name')
      .eq('company_id', companyId)
      .not('name', 'eq', '');

    if (!ucData || ucData.length === 0) {
      return Response.json({ sent: 0, matched: 0, reason: 'no_users_with_names' });
    }

    // 이름 매칭
    const matchedUserIds = ucData
      .filter(uc => {
        const ucName = uc.name.trim().toLowerCase();
        const mName = memberName.trim().toLowerCase();
        return ucName.includes(mName) || mName.includes(ucName);
      })
      .map(uc => uc.user_id);

    if (matchedUserIds.length === 0) {
      return Response.json({ sent: 0, matched: 0, reason: 'no_match' });
    }

    // 매칭된 유저들의 알림 설정 조회
    // 설정 행이 없는 유저는 기본값(모두 켜짐)으로 간주 — 옵트아웃 방식
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('user_id, low_balance_enabled, low_balance_threshold, email_enabled')
      .eq('company_id', companyId)
      .in('user_id', matchedUserIds);

    const prefMap = new Map((prefs || []).map(p => [p.user_id, p]));

    // 자동 발송인 경우: 본인이 잔액 부족 알림을 꺼놨는지 + 임계값 확인
    let filteredUserIds = matchedUserIds;
    if (autoTriggered) {
      const enabledUserIds = matchedUserIds.filter(id => prefMap.get(id)?.low_balance_enabled !== false);

      if (enabledUserIds.length === 0) {
        return Response.json({ sent: 0, matched: matchedUserIds.length, reason: 'noti_disabled' });
      }

      // 임계값 체크
      filteredUserIds = enabledUserIds.filter(id =>
        balance !== undefined ? balance < (prefMap.get(id)?.low_balance_threshold || 5000) : true
      );

      if (filteredUserIds.length === 0) {
        return Response.json({ sent: 0, matched: matchedUserIds.length, reason: 'above_threshold' });
      }
    }

    const emailUserIds = filteredUserIds.filter(id => prefMap.get(id)?.email_enabled !== false);

    // 매칭된 유저들의 FCM 토큰 조회
    const { data: tokenRows } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('company_id', companyId)
      .eq('enabled', true)
      .in('user_id', filteredUserIds);

    const tokens = (tokenRows || []).map(r => r.token);

    if (tokens.length === 0 && emailUserIds.length === 0) {
      return Response.json({ sent: 0, matched: matchedUserIds.length, reason: 'no_tokens' });
    }

    const balanceText = Number(balance).toLocaleString();
    const title = '충전 요청';
    const body = `${String(memberName)}님, 현재 잔액이 ${balanceText}원입니다. 커피비 충전을 부탁드립니다.`;

    let successCount = 0;
    if (tokens.length > 0) {
      const response = await getAdminMessaging().sendEachForMulticast({
        tokens,
        data: { type: 'charge_request', url: '/', title, body },
      });
      successCount = response.successCount;

      // 만료 토큰 정리
      const staleTokens = [];
      response.responses.forEach((res, i) => {
        if (res.error?.code === 'messaging/registration-token-not-registered' ||
            res.error?.code === 'messaging/invalid-registration-token') {
          staleTokens.push(tokens[i]);
        }
      });
      if (staleTokens.length > 0) {
        await supabase.from('fcm_tokens').delete().in('token', staleTokens);
      }
    }

    let emailed = 0;
    if (emailUserIds.length > 0) {
      const emails = await getUserEmails(emailUserIds);
      emailed = await sendNotificationEmails(emails, title, body);
    }

    return Response.json({
      sent: successCount,
      matched: matchedUserIds.length,
      emailed,
    });
  } catch (error) {
    console.error('Send to member error:', error);
    return Response.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
