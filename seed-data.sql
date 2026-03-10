-- ========================================
-- 충전금 + 과거 지출 정산 데이터
-- (멤버는 이미 등록된 상태)
-- ========================================

-- 1. 충전금 (매월 실제 신규 입금액)

-- 2025-12
INSERT INTO deposits (member_id, month, amount) VALUES
  ((SELECT id FROM members WHERE name='김범석(Negan)'), '2025-12', 70000),
  ((SELECT id FROM members WHERE name='김선(Luna)'), '2025-12', 40000),
  ((SELECT id FROM members WHERE name='김선규(Travis)'), '2025-12', 200000),
  ((SELECT id FROM members WHERE name='박규리(Ria)'), '2025-12', 70000),
  ((SELECT id FROM members WHERE name='박해오름(Laura)'), '2025-12', 30000),
  ((SELECT id FROM members WHERE name='최정훈(David)'), '2025-12', 50000),
  ((SELECT id FROM members WHERE name='최태현(Tai)'), '2025-12', 58500),
  ((SELECT id FROM members WHERE name='홍정우(Michael)'), '2025-12', 50000),
  ((SELECT id FROM members WHERE name='박종관 팀장님'), '2025-12', 50000);

-- 2026-01
INSERT INTO deposits (member_id, month, amount) VALUES
  ((SELECT id FROM members WHERE name='김범석(Negan)'), '2026-01', 50000),
  ((SELECT id FROM members WHERE name='김선(Luna)'), '2026-01', 70000),
  ((SELECT id FROM members WHERE name='박규리(Ria)'), '2026-01', 20000),
  ((SELECT id FROM members WHERE name='최정훈(David)'), '2026-01', 50000),
  ((SELECT id FROM members WHERE name='최태현(Tai)'), '2026-01', 40000),
  ((SELECT id FROM members WHERE name='홍정우(Michael)'), '2026-01', 60000),
  ((SELECT id FROM members WHERE name='대표님'), '2026-01', 6300),
  ((SELECT id FROM members WHERE name='Jay님'), '2026-01', 4600);

-- 2026-02
INSERT INTO deposits (member_id, month, amount) VALUES
  ((SELECT id FROM members WHERE name='김범석(Negan)'), '2026-02', 60000),
  ((SELECT id FROM members WHERE name='김선(Luna)'), '2026-02', 20000),
  ((SELECT id FROM members WHERE name='박규리(Ria)'), '2026-02', 30000),
  ((SELECT id FROM members WHERE name='박해오름(Laura)'), '2026-02', 30000),
  ((SELECT id FROM members WHERE name='최태현(Tai)'), '2026-02', 54000),
  ((SELECT id FROM members WHERE name='홍정우(Michael)'), '2026-02', 60000),
  ((SELECT id FROM members WHERE name='대표님'), '2026-02', 8200),
  ((SELECT id FROM members WHERE name='Jay님'), '2026-02', 4600);

-- 2026-03
INSERT INTO deposits (member_id, month, amount) VALUES
  ((SELECT id FROM members WHERE name='김범석(Negan)'), '2026-03', 30000),
  ((SELECT id FROM members WHERE name='김선(Luna)'), '2026-03', 20000),
  ((SELECT id FROM members WHERE name='박규리(Ria)'), '2026-03', 20000),
  ((SELECT id FROM members WHERE name='최정훈(David)'), '2026-03', 50000),
  ((SELECT id FROM members WHERE name='대표님'), '2026-03', 9000);

-- 2. 과거 지출 정산 (월별 총 사용액)
-- shop_id는 NULL로 처리 (아직 업체 미등록)

-- 2025-12 지출
INSERT INTO orders (date, member_id, shop_id, menu_name, price, note) VALUES
  ('2025-12-28', (SELECT id FROM members WHERE name='김범석(Negan)'), NULL, '12월 정산', 36000, '과거데이터'),
  ('2025-12-28', (SELECT id FROM members WHERE name='김선(Luna)'), NULL, '12월 정산', 37400, '과거데이터'),
  ('2025-12-28', (SELECT id FROM members WHERE name='김선규(Travis)'), NULL, '12월 정산', 29200, '과거데이터'),
  ('2025-12-28', (SELECT id FROM members WHERE name='박규리(Ria)'), NULL, '12월 정산', 38600, '과거데이터'),
  ('2025-12-28', (SELECT id FROM members WHERE name='박해오름(Laura)'), NULL, '12월 정산', 14400, '과거데이터'),
  ('2025-12-28', (SELECT id FROM members WHERE name='최정훈(David)'), NULL, '12월 정산', 26900, '과거데이터'),
  ('2025-12-28', (SELECT id FROM members WHERE name='최태현(Tai)'), NULL, '12월 정산', 44500, '과거데이터'),
  ('2025-12-28', (SELECT id FROM members WHERE name='홍정우(Michael)'), NULL, '12월 정산', 38500, '과거데이터'),
  ('2025-12-28', (SELECT id FROM members WHERE name='박종관 팀장님'), NULL, '12월 정산', 11500, '과거데이터'),
  ('2025-12-28', (SELECT id FROM members WHERE name='심사원님'), NULL, '12월 정산', 6000, '과거데이터');

-- 2026-01 지출
INSERT INTO orders (date, member_id, shop_id, menu_name, price, note) VALUES
  ('2026-01-31', (SELECT id FROM members WHERE name='김범석(Negan)'), NULL, '1월 정산', 67800, '과거데이터'),
  ('2026-01-31', (SELECT id FROM members WHERE name='김선(Luna)'), NULL, '1월 정산', 48500, '과거데이터'),
  ('2026-01-31', (SELECT id FROM members WHERE name='김선규(Travis)'), NULL, '1월 정산', 35100, '과거데이터'),
  ('2026-01-31', (SELECT id FROM members WHERE name='박규리(Ria)'), NULL, '1월 정산', 33100, '과거데이터'),
  ('2026-01-31', (SELECT id FROM members WHERE name='박해오름(Laura)'), NULL, '1월 정산', 9300, '과거데이터'),
  ('2026-01-31', (SELECT id FROM members WHERE name='최정훈(David)'), NULL, '1월 정산', 35100, '과거데이터'),
  ('2026-01-31', (SELECT id FROM members WHERE name='최태현(Tai)'), NULL, '1월 정산', 34800, '과거데이터'),
  ('2026-01-31', (SELECT id FROM members WHERE name='홍정우(Michael)'), NULL, '1월 정산', 52800, '과거데이터'),
  ('2026-01-31', (SELECT id FROM members WHERE name='박종관 팀장님'), NULL, '1월 정산', 16100, '과거데이터'),
  ('2026-01-31', (SELECT id FROM members WHERE name='대표님'), NULL, '1월 정산', 8400, '과거데이터'),
  ('2026-01-31', (SELECT id FROM members WHERE name='Jay님'), NULL, '1월 정산', 4600, '과거데이터');

-- 2026-02 지출
INSERT INTO orders (date, member_id, shop_id, menu_name, price, note) VALUES
  ('2026-02-28', (SELECT id FROM members WHERE name='김범석(Negan)'), NULL, '2월 정산', 71700, '과거데이터'),
  ('2026-02-28', (SELECT id FROM members WHERE name='김선(Luna)'), NULL, '2월 정산', 39900, '과거데이터'),
  ('2026-02-28', (SELECT id FROM members WHERE name='김선규(Travis)'), NULL, '2월 정산', 22800, '과거데이터'),
  ('2026-02-28', (SELECT id FROM members WHERE name='박규리(Ria)'), NULL, '2월 정산', 31600, '과거데이터'),
  ('2026-02-28', (SELECT id FROM members WHERE name='박해오름(Laura)'), NULL, '2월 정산', 11800, '과거데이터'),
  ('2026-02-28', (SELECT id FROM members WHERE name='최정훈(David)'), NULL, '2월 정산', 34300, '과거데이터'),
  ('2026-02-28', (SELECT id FROM members WHERE name='최태현(Tai)'), NULL, '2월 정산', 25500, '과거데이터'),
  ('2026-02-28', (SELECT id FROM members WHERE name='홍정우(Michael)'), NULL, '2월 정산', 57700, '과거데이터'),
  ('2026-02-28', (SELECT id FROM members WHERE name='박종관 팀장님'), NULL, '2월 정산', 12100, '과거데이터'),
  ('2026-02-28', (SELECT id FROM members WHERE name='대표님'), NULL, '2월 정산', 8000, '과거데이터'),
  ('2026-02-28', (SELECT id FROM members WHERE name='Jay님'), NULL, '2월 정산', 4600, '과거데이터'),
  ('2026-02-28', (SELECT id FROM members WHERE name='심사원님'), NULL, '2월 정산', 3000, '과거데이터');

-- 2026-03 지출 (현재 진행중)
INSERT INTO orders (date, member_id, shop_id, menu_name, price, note) VALUES
  ('2026-03-10', (SELECT id FROM members WHERE name='김범석(Negan)'), NULL, '3월 정산', 24800, '과거데이터'),
  ('2026-03-10', (SELECT id FROM members WHERE name='김선(Luna)'), NULL, '3월 정산', 16400, '과거데이터'),
  ('2026-03-10', (SELECT id FROM members WHERE name='김선규(Travis)'), NULL, '3월 정산', 15300, '과거데이터'),
  ('2026-03-10', (SELECT id FROM members WHERE name='박규리(Ria)'), NULL, '3월 정산', 9200, '과거데이터'),
  ('2026-03-10', (SELECT id FROM members WHERE name='최정훈(David)'), NULL, '3월 정산', 4600, '과거데이터'),
  ('2026-03-10', (SELECT id FROM members WHERE name='최태현(Tai)'), NULL, '3월 정산', 9200, '과거데이터'),
  ('2026-03-10', (SELECT id FROM members WHERE name='홍정우(Michael)'), NULL, '3월 정산', 15700, '과거데이터'),
  ('2026-03-10', (SELECT id FROM members WHERE name='박종관 팀장님'), NULL, '3월 정산', 6900, '과거데이터'),
  ('2026-03-10', (SELECT id FROM members WHERE name='대표님'), NULL, '3월 정산', 8700, '과거데이터'),
  ('2026-03-10', (SELECT id FROM members WHERE name='Jay님'), NULL, '3월 정산', 4200, '과거데이터');
