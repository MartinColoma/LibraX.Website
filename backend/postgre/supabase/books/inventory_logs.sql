create table public.inventory_logs (
  log_id character varying(20) not null,
  copy_id character varying(20) null,
  action character varying(20) not null,
  performed_by character varying(255) null default 'System'::character varying,
  log_date timestamp without time zone null default now(),
  constraint inventory_logs_pkey primary key (log_id),
  constraint inventory_logs_copy_id_fkey foreign KEY (copy_id) references book_copies (copy_id)
) TABLESPACE pg_default;