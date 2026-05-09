-- ================================================================
-- Migration 003: pilots 테이블에 licenses JSONB 컬럼 추가
-- Supabase SQL Editor에서 실행
-- ================================================================

alter table pilots
  add column if not exists licenses jsonb default '[]'::jsonb;
