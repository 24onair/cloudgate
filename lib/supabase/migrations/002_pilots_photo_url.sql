-- ================================================================
-- Migration 002: pilots 테이블에 photo_url 컬럼 추가
-- Supabase SQL Editor에서 실행
-- ================================================================

alter table pilots
  add column if not exists photo_url text;
