-- ============================================================
-- 구름상회 패러글라이딩 플랫폼 DB 스키마
-- Supabase (PostgreSQL)
-- tenant_id 포함 — 멀티테넌트 확장 대비
-- ============================================================

-- ── 확장 ─────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── 업체(테넌트) ──────────────────────────────────────────────
create table if not exists tenants (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,           -- 서브도메인 식별자 (ex: gureum)
  name        text not null,                  -- 업체명
  phone       text,
  address     text,
  created_at  timestamptz default now()
);

-- 초기 업체 데이터 (구름상회)
insert into tenants (slug, name, phone, address)
values ('gureum', '구름상회', '010-0000-0000', '강원도 ○○군 ○○면')
on conflict (slug) do nothing;

-- ── 파일럿 ───────────────────────────────────────────────────
create table if not exists pilots (
  id               uuid primary key default uuid_generate_v4(),
  tenant_id        uuid references tenants(id) on delete cascade,
  name             text not null,
  phone            text,
  email            text,
  join_date        date,                       -- 입사일
  license_no       text,                       -- 자격증 번호
  license_expiry   date,                       -- 자격증 만료일
  status           text default 'active'       -- active | inactive
    check (status in ('active', 'inactive')),
  rate_per_flight  integer default 30000,      -- 비행 1건당 정산 단가(원)
  photo_url        text,                       -- 프로필 사진 (base64 or Storage URL)
  memo             text,
  -- 퇴직/복직 관련
  inactive_reason  text
    check (inactive_reason in ('resignation','retirement','contract_end','other')),
  inactive_note    text,
  inactive_date    date,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── 상품 ─────────────────────────────────────────────────────
create table if not exists products (
  id            uuid primary key default uuid_generate_v4(),
  tenant_id     uuid references tenants(id) on delete cascade,
  slug          text not null,               -- basic | extreme | vip
  name          text not null,
  subtitle      text,
  price         integer not null,            -- 원
  duration_min  integer,                     -- 비행 시간(분)
  features      text[],                      -- 특징 배열
  badge         text,                        -- 인기 | 프리미엄 | null
  is_featured   boolean default false,
  is_active     boolean default true,
  sort_order    integer default 0,
  created_at    timestamptz default now(),
  unique(tenant_id, slug)
);

-- ── 상품 옵션 ─────────────────────────────────────────────────
create table if not exists product_options (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid references tenants(id) on delete cascade,
  product_id  uuid references products(id) on delete cascade,
  name        text not null,                 -- 사진 패키지
  price       integer not null,             -- 추가 금액(원)
  is_active   boolean default true
);

-- ── 예약 ─────────────────────────────────────────────────────
create table if not exists bookings (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid references tenants(id) on delete cascade,
  booking_no      text unique not null,       -- B-20260509-0001 형식
  -- 고객 정보
  customer_name   text not null,
  customer_phone  text not null,
  -- 상품/일정
  product_id      uuid references products(id),
  product_name    text not null,             -- 스냅샷 (상품 변경 대비)
  product_price   integer not null,
  headcount       integer default 1,
  flight_date     date not null,
  flight_time     text not null,             -- 10:00
  -- 옵션
  options         jsonb default '[]',        -- [{name, price}]
  -- 금액
  total_price     integer not null,          -- 상품+옵션 합계
  deposit_amount  integer not null,          -- 예약금 (30%)
  balance_amount  integer not null,          -- 현장 결제 금액 (70%)
  -- 상태
  status          text default 'pending'
    check (status in ('pending','confirmed','flying','completed','cancelled')),
  -- 채널
  channel         text default 'online'
    check (channel in ('online','phone','walk-in')),
  -- 파일럿 배정
  pilot_id        uuid references pilots(id),
  -- 메모
  memo            text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ── 결제 ─────────────────────────────────────────────────────
create table if not exists payments (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid references tenants(id) on delete cascade,
  booking_id      uuid references bookings(id) on delete cascade,
  type            text not null              -- deposit | balance | refund
    check (type in ('deposit','balance','refund')),
  amount          integer not null,
  method          text,                      -- card | cash | transfer | toss | kakao | naver
  pg_order_id     text,                      -- PG사 주문번호
  pg_payment_key  text,                      -- PG사 결제키
  status          text default 'pending'
    check (status in ('pending','paid','cancelled','refunded')),
  paid_at         timestamptz,
  created_at      timestamptz default now()
);

-- ── 비행 기록 (운영 완료 후 생성) ────────────────────────────
create table if not exists flight_records (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid references tenants(id) on delete cascade,
  booking_id      uuid references bookings(id) on delete cascade,
  pilot_id        uuid references pilots(id),
  flight_date     date not null,
  takeoff_at      timestamptz,
  landing_at      timestamptz,
  weather_grade   text,                      -- GREEN | YELLOW | RED
  memo            text,
  created_at      timestamptz default now()
);

-- ── 파일럿 정산 ───────────────────────────────────────────────
create table if not exists settlements (
  id              uuid primary key default uuid_generate_v4(),
  tenant_id       uuid references tenants(id) on delete cascade,
  pilot_id        uuid references pilots(id) on delete cascade,
  year_month      text not null,             -- 2026-05
  flight_count    integer default 0,
  rate_per_flight integer not null,          -- 정산 단가 스냅샷
  total_amount    integer not null,          -- 지급 금액
  status          text default 'calculating'
    check (status in ('calculating','confirmed','paid')),
  paid_at         timestamptz,
  memo            text,
  created_at      timestamptz default now(),
  unique(pilot_id, year_month)
);

-- ── 파일럿 스케줄 ─────────────────────────────────────────────
create table if not exists pilot_schedules (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid references tenants(id) on delete cascade,
  pilot_id    uuid references pilots(id) on delete cascade,
  date        date not null,
  type        text default 'work'
    check (type in ('work','off','standby','other')),
  memo        text,
  unique(pilot_id, date)
);

-- ── 비용 기록 ─────────────────────────────────────────────────
create table if not exists costs (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid references tenants(id) on delete cascade,
  date        date not null,
  category    text not null,                 -- 연료 | 보험 | 마케팅 | 정비 | 급여 | 기타
  description text,
  amount      integer not null,
  created_at  timestamptz default now()
);

-- ── 고객 후기 ─────────────────────────────────────────────────
create table if not exists reviews (
  id          uuid primary key default uuid_generate_v4(),
  tenant_id   uuid references tenants(id) on delete cascade,
  booking_id  uuid references bookings(id),  -- nullable (직접 작성 가능)
  name        text not null,
  rating      integer not null check (rating between 1 and 5),
  product     text,
  body        text not null,
  images      text[],                        -- 이미지 URL 배열
  status      text default 'pending'
    check (status in ('pending','approved','rejected')),
  created_at  timestamptz default now()
);

-- ============================================================
-- 인덱스
-- ============================================================
create index if not exists idx_bookings_tenant_date   on bookings(tenant_id, flight_date);
create index if not exists idx_bookings_status        on bookings(status);
create index if not exists idx_bookings_pilot         on bookings(pilot_id);
create index if not exists idx_flight_records_pilot   on flight_records(pilot_id, flight_date);
create index if not exists idx_pilot_schedules_date   on pilot_schedules(pilot_id, date);
create index if not exists idx_settlements_pilot      on settlements(pilot_id, year_month);
create index if not exists idx_payments_booking       on payments(booking_id);
create index if not exists idx_costs_tenant_date      on costs(tenant_id, date);
create index if not exists idx_reviews_tenant_status  on reviews(tenant_id, status);

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger bookings_updated_at
  before update on bookings
  for each row execute function update_updated_at();

create or replace trigger pilots_updated_at
  before update on pilots
  for each row execute function update_updated_at();

-- ============================================================
-- Row Level Security (멀티테넌트 데이터 격리)
-- ============================================================
alter table tenants         enable row level security;
alter table pilots          enable row level security;
alter table products        enable row level security;
alter table product_options enable row level security;
alter table bookings        enable row level security;
alter table payments        enable row level security;
alter table flight_records  enable row level security;
alter table settlements     enable row level security;
alter table pilot_schedules enable row level security;
alter table costs           enable row level security;
alter table reviews         enable row level security;

-- service_role 은 RLS 우회 (서버 API에서만 사용)
-- anon/authenticated 는 현재 차단 → 추후 인증 구현 시 정책 추가
