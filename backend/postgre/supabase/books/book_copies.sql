create table public.book_copies (
  copy_id character varying(20) not null,
  book_id character varying(11) null,
  barcode bigint not null,
  status character varying(20) null default 'Available'::character varying,
  book_condition character varying(20) null default 'Good'::character varying,
  location character varying(100) null default 'Main Shelf'::character varying,
  date_added timestamp without time zone null default now(),
  constraint book_copies_pkey primary key (copy_id),
  constraint book_copies_book_id_fkey foreign KEY (book_id) references books (book_id)
) TABLESPACE pg_default;