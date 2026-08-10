import { getAdminMessaging } from '@/lib/firebase-admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifyAuth, validateString, isValidUUID } from '@/lib/api-auth';
import { getUserEmails, sendNotificationEmails } from '@/lib/email';

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, companyId, data } = body;

    if (!type || !companyId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!isValidUUID(companyId)) {
      return Response.json({ error: 'Invalid companyId format' }, { status: 400 });
    }

    // type 허용 목록 확인
    const allowedTypes = ['order_registered', 'low_balance', 'manual'];
    if (!allowedTypes.includes(type)) {
      return Response.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    // data 필드 검증
    if (data) {
      if (data.memberName) {
        const err = validateString(data.memberName, 'memberName', 100);
        if (err) return Response.json({ error: err }, { status: 400 });
      }
      if (data.menuName) {
        const err = validateString(data.menuName, 'menuName', 100);
        if (err) return Response.json({ error: err }, { status: 400 });
      }
      if (data.title) {
        const err = validateString(data.title, 'title', 200);
        if (err) return Response.json({ error: err }, { status: 400 });
      }
      if (data.body) {
        const err = validateString(data.body, 'body', 1000);
        if (err) return Response.json({ error: err }, { status: 400 });
      }
      if (data.price !== undefined && (typeof data.price !== 'number' || !isFinite(data.price))) {
        return Response.json({ error: 'price must be a finite number' }, { status: 400 });
      }
      if (data.balance !== undefined && (typeof data.balance !== 'number' || !isFinite(data.balance))) {
        return Response.json({ error: 'balance must be a finite number' }, { status: 400 });
      }
    }

    // 인증 + 기업 소속 확인 (수동 알림은 관리자만)
    if (type === 'manual') {
      const { error: authError } = await verifyAuth(request, companyId, { roles: ['master', 'admin'] });
      if (authError) return authError;
    } else {
      const { error: authError } = await verifyAuth(request, companyId);
      if (authError) return authError;
    }

    const supabase = getSupabaseAdmin();

    // 기업 전체 유저 + 알림 설정 조회
    // 설정 행이 없는 유저는 기본값(모두 켜짐)으로 간주 — 옵트아웃 방식
    const isManual = type === 'manual';

    const [{ data: companyUsers }, { data: prefs }] = await Promise.all([
      supabase
        .from('user_companies')
        .select('user_id, role')
        .eq('company_id', companyId),
      supabase
        .from('notification_preferences')
        .select('user_id, order_registered_enabled, low_balance_enabled, low_balance_threshold, email_enabled, order_email_enabled')
        .eq('company_id', companyId),
    ]);

    if (!companyUsers || companyUsers.length === 0) {
      return Response.json({ sent: 0, emailed: 0 });
    }

    const prefMap = new Map((prefs || []).map(p => [p.user_id, p]));

    // 수동 알림은 모든 유저에게, 나머지는 해당 유형 알림을 끄지 않은 유저에게 발송
    let targets = companyUsers;
    if (!isManual) {
      const prefColumn = type === 'order_registered'
        ? 'order_registered_enabled'
        : 'low_balance_enabled';

      targets = targets.filter(u => prefMap.get(u.user_id)?.[prefColumn] !== false);

      // 잔액 부족 알림인 경우: 관리자(master/admin)만 + 임계값 체크
      if (type === 'low_balance') {
        targets = targets.filter(u => u.role === 'master' || u.role === 'admin');

        if (data?.balance !== undefined) {
          targets = targets.filter(u => data.balance < (prefMap.get(u.user_id)?.low_balance_threshold || 5000));
        }
      }
    }

    const targetUserIds = targets.map(u => u.user_id);

    if (targetUserIds.length === 0) {
      return Response.json({ sent: 0, emailed: 0 });
    }

    const emailUserIds = targetUserIds.filter(id => {
      const pref = prefMap.get(id);
      if (pref?.email_enabled === false) return false;
      // 주문 등록 이메일은 발송량이 많아 명시적으로 켠 유저에게만 (기본 꺼짐)
      if (type === 'order_registered') return pref?.order_email_enabled === true;
      return true;
    });

    const { data: tokenRows } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('company_id', companyId)
      .eq('enabled', true)
      .in('user_id', targetUserIds);

    const tokens = (tokenRows || []).map(r => r.token);

    if (tokens.length === 0 && emailUserIds.length === 0) {
      return Response.json({ sent: 0, emailed: 0 });
    }

    // 알림 메시지 구성
    const notification = buildNotification(type, data);

    let successCount = 0;
    let failureCount = 0;

    if (tokens.length > 0) {
      // FCM 발송 (notification 필드 없이 data만 전송하여 중복 알림 방지)
      const response = await getAdminMessaging().sendEachForMulticast({
        tokens,
        data: { type, url: '/', title: notification.title, body: notification.body },
      });
      successCount = response.successCount;
      failureCount = response.failureCount;

      // 만료된 토큰 정리
      const staleTokens = [];
      response.responses.forEach((res, i) => {
        if (res.error) {
          if (res.error.code === 'messaging/registration-token-not-registered' ||
              res.error.code === 'messaging/invalid-registration-token') {
            staleTokens.push(tokens[i]);
          }
        }
      });

      if (staleTokens.length > 0) {
        await supabase.from('fcm_tokens').delete().in('token', staleTokens);
      }
    }

    let emailed = 0;
    if (emailUserIds.length > 0) {
      const emails = await getUserEmails(emailUserIds);
      emailed = await sendNotificationEmails(emails, notification.title, notification.body, { companyId, type });
    }

    return Response.json({
      sent: successCount,
      failed: failureCount,
      emailed,
    });
  } catch (error) {
    console.error('Notification send error:', error);
    return Response.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}

function buildNotification(type, data) {
  switch (type) {
    case 'order_registered':
      return {
        title: '새 주문 등록',
        body: `${String(data.memberName || '')}님이 ${String(data.menuName || '')} (${Number(data.price).toLocaleString()}원)을 주문했습니다.`,
      };
    case 'low_balance':
      return {
        title: '잔액 부족 알림',
        body: `${String(data.memberName || '')}님의 잔액이 ${Number(data.balance).toLocaleString()}원입니다. 충전이 필요합니다.`,
      };
    case 'manual':
      return {
        title: String(data?.title || '커피 대장부').slice(0, 200),
        body: String(data?.body || '새로운 알림이 있습니다.').slice(0, 1000),
      };
    default:
      return { title: '커피 대장부', body: '새로운 알림이 있습니다.' };
  }
}
