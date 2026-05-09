-- ================================================================
-- Migration 001: pilots 테이블 퇴직/복직 관련 컬럼 추가
-- Supabase SQL Editor에서 실행
-- ================================================================

alter table pilots
  add column if not exists join_date       date,
  add column if not exists inactive_reason text
    check (inactive_reason in ('resignation','retirement','contract_end','other')),
  add column if not exists inactive_note   text,
  add column if not exists inactive_date   date,
  add column if not exists updated_at      timestamptz default now();

-- updated_at 자동 갱신 트리거 (bookings와 동일 패턴)
create or replace trigger pilots_updated_at
  before update on pilots
  for each row execute function update_updated_at();
