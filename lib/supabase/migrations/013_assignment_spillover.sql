-- 013: 슬롯 이월 배정 지원
-- 1) booking_pilots.assigned_flight_time
--    예약은 bookings.flight_time(요청 슬롯) 한 개를 가지지만,
--    배정 결과는 슬롯별로 다를 수 있으므로 각 행이 실제 비행 시간을 가짐.
-- 2) bookings.assignment_status
--    'auto'                 — 자동 배정 정상 완료
--    'pending_admin_review' — 영업종료 초과 등으로 자동 배정이 불가하여 어드민 수동 처리 필요
--    'manual'               — 어드민이 수동 조정한 상태

alter table booking_pilots
  add column if not exists assigned_flight_time text;  -- "HH:MM"

-- 백필: 기존 행은 모두 예약의 flight_time을 그대로 사용
update booking_pilots bp
   set assigned_flight_time = b.flight_time
  from bookings b
 where bp.booking_id = b.id
   and bp.assigned_flight_time is null;

create index if not exists idx_booking_pilots_pilot_time
  on booking_pilots(pilot_id, assigned_flight_time);

alter table bookings
  add column if not exists assignment_status text default 'auto'
    check (assignment_status in ('auto','pending_admin_review','manual'));

create index if not exists idx_bookings_assignment_status
  on bookings(assignment_status)
  where assignment_status = 'pending_admin_review';
