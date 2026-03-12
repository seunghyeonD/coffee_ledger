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
    let tokens = [];

    if (isManual) {
      // 수동 알림: FCM 토큰이 있는 모든 유저에게 발송 (알림 설정 무관)
      const { data: tokenRows, error: tokenError } = await supabase
        .from('fcm_tokens')
        .select('token')
        .eq('company_id', companyId);

      console.log('Manual noti - companyId:', companyId, 'tokens found:', tokenRows?.length, 'error:', tokenError);

      if (!tokenRows || tokenRows.length === 0) {
        return Response.json({ sent: 0, debug: { companyId, tokensFound: 0, error: tokenError?.message } });
      }
      tokens = tokenRows.map(r => r.token);
    } else {
      const prefColumn = type === 'order_registered'
        ? 'order_registered_enabled'
        : 'low_balance_enabled';

      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('user_id, low_balance_threshold')
        .eq('company_id', companyId)
        .eq(prefColumn, true);

      if (!prefs || prefs.length === 0) {
        return Response.json({ sent: 0 });
      }

      let targetUserIds = prefs.map(p => p.user_id);

      // 잔액 부족 알림인 경우: 관리자(master/admin)만 + 임계값 체크
      if (type === 'low_balance') {
        const { data: ucData } = await supabase
          .from('user_companies')
          .select('user_id, role')
          .eq('company_id', companyId)
          .in('user_id', targetUserIds)
          .in('role', ['master', 'admin']);

        const adminUserIds = (ucData || []).map(uc => uc.user_id);

        if (data?.balance !== undefined) {
          targetUserIds = prefs
            .filter(p => adminUserIds.includes(p.user_id) && data.balance < (p.low_balance_threshold || 5000))
            .map(p => p.user_id);
        } else {
          targetUserIds = adminUserIds;
        }
      }

      if (targetUserIds.length === 0) {
        return Response.json({ sent: 0 });
      }

      const { data: tokenRows } = await supabase
        .from('fcm_tokens')
        .select('token, user_id')
        .eq('company_id', companyId)
        .in('user_id', targetUserIds);

      if (!tokenRows || tokenRows.length === 0) {
        return Response.json({ sent: 0 });
      }

      tokens = tokenRows.map(r => r.token);
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
      webpush: {
        notification: {
          icon: 'https://coffeeledger.co.kr/notification-icon.png',
        },
      },
    });

    // 에러 상세 로깅 및 만료된 토큰 정리
    const staleTokens = [];
    const errors = [];
    response.responses.forEach((res, i) => {
      if (res.error) {
        errors.push({ code: res.error.code, message: res.error.message });
        if (res.error.code === 'messaging/registration-token-not-registered' ||
            res.error.code === 'messaging/invalid-registration-token') {
          staleTokens.push(tokens[i]);
        }
      }
    });

    if (errors.length > 0) {
      console.log('FCM send errors:', JSON.stringify(errors));
    }

    if (staleTokens.length > 0) {
      await supabase.from('fcm_tokens').delete().in('token', staleTokens);
    }

    return Response.json({
      sent: response.successCount,
      failed: response.failureCount,
      errors: errors.length > 0 ? errors : undefined,
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
