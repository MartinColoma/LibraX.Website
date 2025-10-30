create table
    public.authors (
        author_id integer not null,
        name character varying(255) not null,
        biography text null,
        constraint authors_pkey primary key (author_id)
    ) TABLESPACE pg_default;

create table
public.book_authors (
    book_id character varying(11) not null,
    author_id integer not null,
    constraint book_authors_pkey primary key (book_id, author_id),
    constraint book_authors_author_id_fkey foreign KEY (author_id) references authors (author_id),
    constraint book_authors_book_id_fkey foreign KEY (book_id) references books (book_id)
) TABLESPACE pg_default;

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

create table
    public.categories (
        category_id integer generated always as identity not null,
        category_name character varying(255) not null,
        category_description text null,
        category_type character varying(20) not null,
        constraint categories_pkey primary key (category_id),
        constraint categories_category_name_key unique (category_name)
    ) TABLESPACE pg_default;

create table public.inventory_logs (
  log_id character varying(20) not null,
  copy_id character varying(20) null,
  action character varying(20) not null,
  performed_by character varying(255) null default 'System'::character varying,
  log_date timestamp without time zone null default now(),
  constraint inventory_logs_pkey primary key (log_id),
  constraint inventory_logs_copy_id_fkey foreign KEY (copy_id) references book_copies (copy_id)
) TABLESPACE pg_default;