import { getAdminMessaging } from '@/lib/firebase-admin';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request) {
  try {
    const { companyId, memberName, balance } = await request.json();

    if (!companyId || !memberName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

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

    // 이름 매칭: 멤버 이름이 유저 이름에 포함되거나, 유저 이름이 멤버 이름에 포함
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

    // 매칭된 유저들의 FCM 토큰 조회
    const { data: tokenRows } = await supabase
      .from('fcm_tokens')
      .select('token')
      .eq('company_id', companyId)
      .in('user_id', matchedUserIds);

    if (!tokenRows || tokenRows.length === 0) {
      return Response.json({ sent: 0, matched: matchedUserIds.length, reason: 'no_tokens' });
    }

    const tokens = tokenRows.map(r => r.token);
    const balanceText = Number(balance).toLocaleString();

    const response = await getAdminMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: '충전 요청',
        body: `${memberName}님, 현재 잔액이 ${balanceText}원입니다. 커피비 충전을 부탁드립니다.`,
        image: 'https://coffeeledger.co.kr/notification-icon.png',
      },
      webpush: {
        notification: {
          icon: 'https://coffeeledger.co.kr/notification-icon.png',
        },
      },
      data: { type: 'charge_request', url: '/' },
    });

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

    return Response.json({
      sent: response.successCount,
      matched: matchedUserIds.length,
    });
  } catch (error) {
    console.error('Send to member error:', error);
    return Response.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
