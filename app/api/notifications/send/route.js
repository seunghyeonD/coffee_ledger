import { getAdminMessaging } from '@/lib/firebase-admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, companyId, data } = body;

    if (!type || !companyId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 수동 알림은 모든 유저에게 발송
    const isManual = type === 'manual';

    let prefs;
    if (isManual) {
      const { data } = await supabase
        .from('notification_preferences')
        .select('user_id, low_balance_threshold')
        .eq('company_id', companyId);
      prefs = data;
    } else {
      const prefColumn = type === 'order_registered'
        ? 'order_registered_enabled'
        : 'low_balance_enabled';

      const { data } = await supabase
        .from('notification_preferences')
        .select('user_id, low_balance_threshold')
        .eq('company_id', companyId)
        .eq(prefColumn, true);
      prefs = data;
    }

    if (!prefs || prefs.length === 0) {
      return Response.json({ sent: 0 });
    }

    const userIds = prefs.map(p => p.user_id);

    // 해당 유저들의 FCM 토큰 조회
    const { data: tokenRows } = await supabase
      .from('fcm_tokens')
      .select('token, user_id')
      .eq('company_id', companyId)
      .in('user_id', userIds);

    if (!tokenRows || tokenRows.length === 0) {
      return Response.json({ sent: 0 });
    }

    // 잔액 부족 알림인 경우, 임계값 체크
    let tokens = tokenRows.map(r => r.token);
    if (type === 'low_balance' && data?.balance !== undefined) {
      const relevantUserIds = prefs
        .filter(p => data.balance < (p.low_balance_threshold || 5000))
        .map(p => p.user_id);
      tokens = tokenRows
        .filter(r => relevantUserIds.includes(r.user_id))
        .map(r => r.token);
    }

    if (tokens.length === 0) {
      return Response.json({ sent: 0 });
    }

    // 알림 메시지 구성
    const notification = buildNotification(type, data);

    // FCM 발송
    const response = await getAdminMessaging().sendEachForMulticast({
      tokens,
      notification,
      data: { type, url: '/' },
    });

    // 만료된 토큰 정리
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

    return Response.json({
      sent: response.successCount,
      failed: response.failureCount,
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
        body: `${data.memberName}님이 ${data.menuName} (${Number(data.price).toLocaleString()}원)을 주문했습니다.`,
      };
    case 'low_balance':
      return {
        title: '잔액 부족 알림',
        body: `${data.memberName}님의 잔액이 ${Number(data.balance).toLocaleString()}원입니다. 충전이 필요합니다.`,
      };
    case 'manual':
      return {
        title: data?.title || '커피 대장부',
        body: data?.body || '새로운 알림이 있습니다.',
      };
    default:
      return { title: '커피 대장부', body: '새로운 알림이 있습니다.' };
  }
}
