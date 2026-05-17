-- 016: booking_pilots unique 제약 완화
--
-- 라운드로빈 큐가 한 바퀴를 돌면 한 예약 안에서도 같은 파일럿이
-- 다른 시각 슬롯에 들어갈 수 있음 (예: 손님 7명 + 파일럿 5명, 슬롯 1에 5명, 다음 슬롯에 2명).
--
-- 변경:
--   구: unique(booking_id, pilot_id)
--   신: unique(booking_id, pilot_id, assigned_flight_time)
-- 의미: 같은 예약 + 같은 시각 + 같은 파일럿만 금지. 시각이 다르면 같은 파일럿 OK.

alter table booking_pilots
  drop constraint if exists booking_pilots_booking_id_pilot_id_key;

create unique index if not exists booking_pilots_booking_pilot_time_key
  on booking_pilots(booking_id, pilot_id, assigned_flight_time);

-- 검증 쿼리 (참고용)
-- select indexname, indexdef from pg_indexes where tablename = 'booking_pilots';
