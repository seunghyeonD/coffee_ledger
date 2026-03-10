-- Supabase에서 SQL Editor로 실행해주세요

-- 멤버 테이블
create table members (
  id bigserial primary key,
  name text not null,
  initial_balance integer default 0,
  created_at timestamptz default now()
);

-- 업체 테이블
create table shops (
  id bigserial primary key,
  name text not null,
  color text default '#4a90d9',
  created_at timestamptz default now()
);

-- 메뉴 테이블
create table menus (
  id bigserial primary key,
  shop_id bigint references shops(id) on delete cascade,
  name text not null,
  price integer not null default 0,
  created_at timestamptz default now()
);

-- 주문 테이블
create table orders (
  id bigserial primary key,
  date date not null,
  member_id bigint references members(id) on delete cascade,
  shop_id bigint references shops(id) on delete set null,
  menu_name text not null,
  price integer not null,
  note text default '',
  created_at timestamptz default now()
);

-- 충전(입금) 테이블
create table deposits (
  id bigserial primary key,
  member_id bigint references members(id) on delete cascade,
  month text not null,
  amount integer not null,
  created_at timestamptz default now()
);

-- 인덱스
create index idx_orders_date on orders(date);
create index idx_orders_member on orders(member_id);
create index idx_deposits_member on deposits(member_id);
create index idx_menus_shop on menus(shop_id);

-- RLS (Row Level Security) - 공개 접근 허용
alter table members enable row level security;
alter table shops enable row level security;
alter table menus enable row level security;
alter table orders enable row level security;
alter table deposits enable row level security;

create policy "Allow all access to members" on members for all using (true) with check (true);
create policy "Allow all access to shops" on shops for all using (true) with check (true);
create policy "Allow all access to menus" on menus for all using (true) with check (true);
create policy "Allow all access to orders" on orders for all using (true) with check (true);
create policy "Allow all access to deposits" on deposits for all using (true) with check (true);
