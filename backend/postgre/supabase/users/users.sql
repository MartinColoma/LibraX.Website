create table public.users (
  user_id character varying(20) not null,
  user_type public.user_type_enum not null,
  role public.user_role_enum null,
  first_name character varying(50) not null,
  last_name character varying(50) not null,
  gender public.gender_enum null,
  birthday date null,
  address text null,
  email character varying(100) not null,
  phone_number character varying(20) null,
  student_faculty_id character varying(20) null,
  username character varying(50) null,
  password_hash character varying(255) not null,
  nfc_uid character varying(20) null,
  status public.user_status_enum not null default 'Active'::user_status_enum,
  date_hired date null,
  last_login timestamp without time zone null,
  date_registered date null default CURRENT_DATE,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  updated_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint users_pkey primary key (user_id),
  constraint users_email_key unique (email),
  constraint users_nfc_uid_key unique (nfc_uid),
  constraint users_student_faculty_id_key unique (student_faculty_id)
) TABLESPACE pg_default;

create trigger before_insert_user_id BEFORE INSERT on users for EACH row
execute FUNCTION generate_user_id ();

create trigger trigger_update_timestamp BEFORE
update on users for EACH row
execute FUNCTION update_timestamp ();