-- 012: costs 테이블 누락 컬럼 추가
-- 목적: 변동비 입력 시 memo·receipt_data_url·cost_type을 저장할 수 있도록 한다.
-- 이 컬럼들이 없어서 /api/costs POST가 silent fail → DB 미저장 → 장사리포트 변동비 0원.

alter table costs
  add column if not exists memo             text,
  add column if not exists receipt_data_url text,
  add column if not exists cost_type        text default 'variable'
    check (cost_type in ('variable','fixed'));

-- 기간 조회용 인덱스 (이미 있을 수 있음)
create index if not exists idx_costs_tenant_date on costs(tenant_id, date);
