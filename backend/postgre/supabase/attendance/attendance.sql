create table public.attendance (
  attendance_id serial not null,
  user_id character varying(20) null,
  nfc_uid character varying(20) null,
  reader_number integer not null,
  scan_time timestamp without time zone null default CURRENT_TIMESTAMP,
  status character varying(20) null default 'Present'::character varying,
  remarks text null,
  constraint attendance_pkey primary key (attendance_id),
  constraint attendance_nfc_uid_fkey foreign KEY (nfc_uid) references users (nfc_uid) on delete CASCADE,
  constraint attendance_user_id_fkey foreign KEY (user_id) references users (user_id) on delete CASCADE
) TABLESPACE pg_default;

create trigger trigger_attendance_timestamp BEFORE INSERT on attendance for EACH row
execute FUNCTION update_attendance_timestamp ();