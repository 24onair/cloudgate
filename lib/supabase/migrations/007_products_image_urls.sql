-- 007: products 테이블에 image_urls 컬럼 추가
-- 상품 이미지 URL 배열 (Supabase Storage 업로드 후 URL 저장)
alter table products
  add column if not exists image_urls jsonb not null default '[]'::jsonb;

-- 기존 소프트 삭제된 상품 완전 제거 (실수로 등록된 테스트 데이터 정리)
-- delete from products where is_active = false;  -- 필요 시 주석 해제
