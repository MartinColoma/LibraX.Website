create view public.attendance_view as
select
  a.attendance_id,
  a.scan_time,
  a.reader_number,
  a.status,
  u.user_id,
  u.first_name,
  u.last_name,
  u.role,
  u.nfc_uid
from
  attendance a
  join users u on a.user_id::text = u.user_id::text
order by
  a.scan_time desc;