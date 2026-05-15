-- 008: product_options 테이블에 description 컬럼 추가
alter table product_options
  add column if not exists description text not null default '';
