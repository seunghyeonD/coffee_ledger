import { getAdminMessaging } from '@/lib/firebase-admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyAuth, validateString, isValidUUID } from '@/lib/api-auth';
import { getUserEmails, sendNotificationEmails } from '@/lib/email';

const DEFAULT_THRESHOLD = 5000;

export async function POST(request) {
  try {
    const {
      companyId, memberId, memberName, balance, autoTriggered, channel,
      title: customTitle, body: customBody,
    } = await request.json();

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

    if (memberId !== undefined && !Number.isInteger(memberId)) {
      return Response.json({ error: 'memberId must be an integer' }, { status: 400 });
    }

    if (balance !== undefined && (typeof balance !== 'number' || !isFinite(balance))) {
      return Response.json({ error: 'balance must be a finite number' }, { status: 400 });
    }

    if (autoTriggered !== undefined && typeof autoTriggered !== 'boolean') {
      return Response.json({ error: 'autoTriggered must be a boolean' }, { status: 400 });
    }

    // channel 미지정 시 푸시+이메일 모두 발송
    if (channel !== undefined && !['push', 'email'].includes(channel)) {
      return Response.json({ error: 'channel must be push or email' }, { status: 400 });
    }
    const usePush = channel !== 'email';
    const useEmail = channel !== 'push';

    // 직접 입력 메시지 (제목/내용 모두 있을 때만 기본 문구 대체)
    if (customTitle !== undefined) {
      const err = validateString(customTitle, 'title', 200);
      if (err) return Response.json({ error: err }, { status: 400 });
    }
    if (customBody !== undefined) {
      const err = validateString(customBody, 'body', 1000);
      if (err) return Response.json({ error: err }, { status: 400 });
    }

    // 인증 + 기업 소속 확인
    const { error: authError } = await verifyAuth(request, companyId);
    if (authError) return authError;

    const supabase = getSupabaseAdmin();

    // 장부 멤버에 등록된 이메일 조회 (계정 가입 없이도 직접 발송 가능)
    let memberEmail = null;
    if (useEmail && memberId !== undefined) {
      const { data: memberRow } = await supabase
        .from('members')
        .select('email')
        .eq('company_id', companyId)
        .eq('id', memberId)
        .maybeSingle();
      memberEmail = memberRow?.email?.trim() || null;
    }

    // 자동 발송 시 멤버 직접 이메일은 기본 임계값 적용
    if (autoTriggered && balance !== undefined && balance >= DEFAULT_THRESHOLD) {
      memberEmail = null;
    }

    // user_companies에서 name이 memberName을 포함하거나 일치하는 유저 찾기
    const { data: ucData } = await supabase
      .from('user_companies')
      .select('user_id, name')
      .eq('company_id', companyId)
      .not('name', 'eq', '');

    const matchedUserIds = (ucData || [])
      .filter(uc => {
        const ucName = uc.name.trim().toLowerCase();
        const mName = memberName.trim().toLowerCase();
        return ucName.includes(mName) || mName.includes(ucName);
      })
      .map(uc => uc.user_id);

    // 매칭된 유저들의 알림 설정 조회
    // 설정 행이 없는 유저는 기본값(모두 켜짐)으로 간주 — 옵트아웃 방식
    const { data: prefs } = matchedUserIds.length > 0
      ? await supabase
          .from('notification_preferences')
          .select('user_id, low_balance_enabled, low_balance_threshold, email_enabled')
          .eq('company_id', companyId)
          .in('user_id', matchedUserIds)
      : { data: [] };

    const prefMap = new Map((prefs || []).map(p => [p.user_id, p]));

    // 자동 발송인 경우: 본인이 잔액 부족 알림을 꺼놨는지 + 임계값 확인
    let filteredUserIds = matchedUserIds;
    if (autoTriggered) {
      filteredUserIds = matchedUserIds
        .filter(id => prefMap.get(id)?.low_balance_enabled !== false)
        .filter(id =>
          balance !== undefined
            ? balance < (prefMap.get(id)?.low_balance_threshold || DEFAULT_THRESHOLD)
            : true
        );
    }

    const emailUserIds = useEmail
      ? filteredUserIds.filter(id => prefMap.get(id)?.email_enabled !== false)
      : [];

    // 매칭된 유저들의 FCM 토큰 조회
    const { data: tokenRows } = usePush && filteredUserIds.length > 0
      ? await supabase
          .from('fcm_tokens')
          .select('token')
          .eq('company_id', companyId)
          .eq('enabled', true)
          .in('user_id', filteredUserIds)
      : { data: [] };

    const tokens = (tokenRows || []).map(r => r.token);

    if (tokens.length === 0 && emailUserIds.length === 0 && !memberEmail) {
      const reason = matchedUserIds.length === 0 ? 'no_match' : 'no_tokens';
      return Response.json({ sent: 0, matched: matchedUserIds.length, emailed: 0, reason });
    }

    const balanceText = Number(balance).toLocaleString();
    const hasCustom = Boolean(customTitle?.trim() && customBody?.trim());
    const title = hasCustom ? customTitle.trim() : '충전 요청';
    const body = hasCustom
      ? customBody.trim()
      : `${String(memberName)}님, 현재 잔액이 ${balanceText}원입니다. 커피비 충전을 부탁드립니다.`;

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

    // 계정 이메일 + 멤버 직접 이메일 합산 (중복 제거)
    let emailed = 0;
    const accountEmails = emailUserIds.length > 0 ? await getUserEmails(emailUserIds) : [];
    const emails = [...new Set([...accountEmails, ...(memberEmail ? [memberEmail] : [])])];
    if (emails.length > 0) {
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
