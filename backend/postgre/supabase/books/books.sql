create table public.books (
  book_id character varying(11) not null,
  isbn character varying(20) null,
  title character varying(255) not null,
  subtitle character varying(255) null,
  description text null,
  publisher character varying(255) null,
  publication_year integer null,
  edition character varying(50) null,
  category_id integer null,
  language character varying(50) null default 'English'::character varying,
  date_added timestamp without time zone null default now(),
  constraint books_pkey primary key (book_id),
  constraint books_category_id_fkey foreign KEY (category_id) references categories (category_id)
) TABLESPACE pg_default;