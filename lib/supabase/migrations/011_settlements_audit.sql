-- 011: 정산 감사·지급 메타 + 분배율 스냅샷 + 파일럿 계좌
-- 목적:
--   1) /admin/settlement에서 정산 확정/지급 버튼을 통한 상태 전환 지원
--   2) 확정 시점 분배율을 스냅샷으로 저장 (분배율 변경 후에도 과거 정산 금액 불변)
--   3) 파일럿 계좌 정보를 정산서에 표시하기 위한 컬럼 추가

-- ── settlements 컬럼 추가 ──────────────────────────────────────────
alter table settlements
  add column if not exists confirmed_at   timestamptz,
  add column if not exists pay_method     text check (pay_method in ('transfer','cash','other')),
  add column if not exists pay_memo       text,
  add column if not exists share_snapshot jsonb,
  add column if not exists updated_at     timestamptz default now();

-- updated_at 트리거 (이미 있으면 그대로)
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists settlements_set_updated_at on settlements;
create trigger settlements_set_updated_at
  before update on settlements
  for each row execute function set_updated_at();

-- 인덱스: 테넌트 + 월 조회 가속
create index if not exists idx_settlements_tenant_ym on settlements(tenant_id, year_month);

-- ── pilots 계좌 컬럼 추가 ─────────────────────────────────────────
alter table pilots
  add column if not exists bank_name      text,
  add column if not exists account_number text,
  add column if not exists account_holder text;
