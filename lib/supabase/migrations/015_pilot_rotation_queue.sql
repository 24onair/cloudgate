-- 015: 파일럿 라운드로빈 큐 포인터
--
-- 모델 B(큐 포인터). 현장 운영 규칙:
--   "마지막에 비행한 파일럿"의 다음 사람부터 다음 비행 시작.
--   하루를 넘어서 이어지며, 휴가자는 자동 건너뜀, 복귀자는 본래 순번 자리에 끼어듦.
--
-- 정렬 키는 더 이상 (당일 비행수 → 순번 → 이름)이 아니라,
-- (큐 인덱스 단일 키)로 단순화. 큐 인덱스는 last_assigned_pilot_id 다음부터 0이 됨.
--
-- 일일 최대 비행수, 휴식 간격 등은 BACKLOG.md의 P1 항목에서 별도 처리 예정.

create table if not exists pilot_rotation_state (
  tenant_id              uuid primary key references tenants(id) on delete cascade,
  last_assigned_pilot_id uuid references pilots(id) on delete set null,
  last_assigned_at       timestamptz,
  updated_at             timestamptz not null default now()
);

-- 검증 쿼리 (참고용)
-- select * from pilot_rotation_state where tenant_id = '<your-tenant>';
