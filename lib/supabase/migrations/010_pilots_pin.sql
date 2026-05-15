-- 파일럿 개인 PIN 컬럼 추가
-- 기본값 "0000" (관리자가 파일럿별로 변경)
alter table pilots
  add column if not exists pin text not null default '0000';
