-- 014: 파일럿 순번(rotation) 도입
--
-- 현장 운영에서 파일럿들이 정해진 순서대로 손님을 태우는 라운드로빈 방식을 반영하기 위함.
-- 자동 배정 정렬 키:
--   ① 당일 비행수 오름차순 (균등 분배)
--   ② 순번(rotation_order, 일자 오버라이드 있으면 그 값) 오름차순
--   ③ 이름 가나다순 (동률 깨기)
--
-- 1) pilots.rotation_order — 기본 순번 (한 번 정해두면 유지)
-- 2) pilot_rotation_overrides — 특정 날짜만의 임시 순번
--
-- 마이그레이션 직후 기존 active 파일럿들에는 이름 가나다순으로 1, 2, 3… 자동 부여.

-- 1) 기본 순번 컬럼
alter table pilots
  add column if not exists rotation_order integer;

-- 활성 파일럿 + 순번 부여된 행만 대상으로 인덱싱
create index if not exists idx_pilots_rotation
  on pilots(tenant_id, rotation_order)
  where status = 'active' and rotation_order is not null;

-- 2) 기존 active 파일럿에 순번 백필 (tenant별, 이름 가나다순)
with ranked as (
  select
    id,
    row_number() over (partition by tenant_id order by name asc, id asc) as rn
  from pilots
  where status = 'active' and rotation_order is null
)
update pilots p
   set rotation_order = ranked.rn
  from ranked
 where p.id = ranked.id;

-- 3) 일자별 오버라이드 테이블
create table if not exists pilot_rotation_overrides (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  pilot_id     uuid not null references pilots(id)  on delete cascade,
  date         date not null,
  order_idx    integer not null,
  created_at   timestamptz not null default now(),
  unique (tenant_id, pilot_id, date)
);

create index if not exists idx_pilot_rotation_overrides_date
  on pilot_rotation_overrides(tenant_id, date);

-- 4) 검증 쿼리 (참고용, 실행 안 됨)
-- select id, name, rotation_order from pilots where tenant_id = '...' order by rotation_order asc;
-- select * from pilot_rotation_overrides where date = current_date order by order_idx asc;
