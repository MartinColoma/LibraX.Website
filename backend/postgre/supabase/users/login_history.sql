create table public.login_history (
  history_id character varying(20) not null,
  user_id character varying(20) not null,
  user_type public.user_type_enum not null,
  ip_address character varying(100) null default 'Unknown'::character varying,
  user_agent text null default 'Unknown'::text,
  login_time timestamp without time zone null default CURRENT_TIMESTAMP,
  logout_time timestamp without time zone null,
  created_at timestamp without time zone null default CURRENT_TIMESTAMP,
  constraint login_history_pkey primary key (history_id),
  constraint fk_login_user foreign KEY (user_id) references users (user_id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_login_user_id on public.login_history using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_login_time on public.login_history using btree (login_time) TABLESPACE pg_default;

create index IF not exists idx_user_type on public.login_history using btree (user_type) TABLESPACE pg_default;