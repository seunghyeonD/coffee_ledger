import { getSupabaseAdmin } from './supabase-admin';

// Resend 배치 발송 API (한 번에 최대 100건)
const RESEND_BATCH_URL = 'https://api.resend.com/emails/batch';
const BATCH_SIZE = 100;

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

// user_id 목록 → Supabase Auth에 등록된 이메일 목록
export async function getUserEmails(userIds) {
  const supabase = getSupabaseAdmin();
  const results = await Promise.all(
    userIds.map(id => supabase.auth.admin.getUserById(id).catch(() => null))
  );
  return results.map(r => r?.data?.user?.email).filter(Boolean);
}

// 알림 제목/본문을 그대로 이메일로 발송. 발송 성공 건수를 반환하며 절대 throw하지 않는다
// (이메일 실패가 푸시 발송 응답을 막으면 안 됨).
export async function sendNotificationEmails(emails, title, body) {
  if (!isEmailConfigured() || !emails || emails.length === 0) return 0;

  const from = process.env.EMAIL_FROM || '커피 대장부 <onboarding@resend.dev>';
  const html = buildEmailHtml(title, body);

  let sent = 0;
  for (let i = 0; i < emails.length; i += BATCH_SIZE) {
    const batch = emails.slice(i, i + BATCH_SIZE).map(to => ({
      from,
      to,
      subject: title,
      html,
      text: body,
    }));

    try {
      const res = await fetch(RESEND_BATCH_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });

      if (res.ok) {
        sent += batch.length;
      } else {
        console.error('Resend batch error:', res.status, await res.text());
      }
    } catch (e) {
      console.error('Resend request failed:', e);
    }
  }
  return sent;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function buildEmailHtml(title, body) {
  return `
<div style="background:#f5f1ec;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e8e0d8;">
    <div style="background:#6f4e37;padding:20px 24px;">
      <span style="color:#ffffff;font-size:16px;font-weight:700;">☕ 커피 대장부</span>
    </div>
    <div style="padding:28px 24px;">
      <h1 style="margin:0 0 12px;font-size:18px;color:#3d2b1f;">${escapeHtml(title)}</h1>
      <p style="margin:0;font-size:15px;line-height:1.7;color:#4a4a4a;white-space:pre-line;">${escapeHtml(body)}</p>
    </div>
    <div style="padding:16px 24px;border-top:1px solid #f0ebe5;">
      <p style="margin:0;font-size:12px;color:#9b9187;">
        이 메일은 커피 대장부 알림 설정에 따라 발송되었습니다.<br />
        수신을 원치 않으시면 설정 &gt; 알림에서 이메일 알림을 꺼주세요.
      </p>
    </div>
  </div>
</div>`;
}
