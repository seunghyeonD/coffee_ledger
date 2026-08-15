-- 기업별 입금계좌 설정 (2026-08)
-- 대시보드에 표시되는 입금계좌를 기업마다 admin이 직접 설정할 수 있도록
-- companies 테이블에 컬럼을 추가합니다. Supabase 대시보드 SQL Editor에서 실행하세요.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS bank_account text;
