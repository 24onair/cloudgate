-- 009: booking_pilots 중간 테이블
-- 예약 1건에 파일럿 여러 명을 배정할 수 있도록 지원
-- (tandem 패러글라이딩: 1인 1파일럿, headcount=3 → 파일럿 3명)

create table if not exists booking_pilots (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  booking_id  uuid not null references bookings(id) on delete cascade,
  pilot_id    uuid not null references pilots(id)   on delete cascade,
  slot_no     integer not null default 1,  -- 탑승자 순번 (1, 2, 3 ...)
  created_at  timestamptz default now(),
  unique(booking_id, pilot_id)             -- 동일 예약에 같은 파일럿 중복 배정 방지
);

create index if not exists idx_booking_pilots_booking_id on booking_pilots(booking_id);
create index if not exists idx_booking_pilots_pilot_id   on booking_pilots(pilot_id);
create index if not exists idx_booking_pilots_tenant_id  on booking_pilots(tenant_id);

-- RLS (선택): service_role 키 사용 시 불필요하지만 보안을 위해 추가
-- alter table booking_pilots enable row level security;
