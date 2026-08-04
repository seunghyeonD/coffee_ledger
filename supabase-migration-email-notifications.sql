-- 이메일 알림 기능: notification_preferences에 이메일 수신 여부 컬럼 추가
-- 옵트아웃 방식: 기본값 true (설정 행이 없는 유저도 발송 로직에서 켜짐으로 간주)
-- Supabase 대시보드 > SQL Editor에서 실행하세요.

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS email_enabled boolean NOT NULL DEFAULT true;

-- 이전 버전(DEFAULT false)으로 이미 실행했던 경우를 위한 보정
ALTER TABLE notification_preferences
  ALTER COLUMN email_enabled SET DEFAULT true;

UPDATE notification_preferences SET email_enabled = true WHERE email_enabled = false;
