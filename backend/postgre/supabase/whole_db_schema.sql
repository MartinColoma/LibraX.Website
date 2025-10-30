-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.attendance (
  attendance_id integer NOT NULL DEFAULT nextval('attendance_attendance_id_seq'::regclass),
  user_id character varying,
  nfc_uid character varying,
  reader_number integer NOT NULL,
  scan_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  status character varying DEFAULT 'Present'::character varying,
  remarks text,
  CONSTRAINT attendance_pkey PRIMARY KEY (attendance_id),
  CONSTRAINT attendance_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT attendance_nfc_uid_fkey FOREIGN KEY (nfc_uid) REFERENCES public.users(nfc_uid)
);
CREATE TABLE public.authors (
  author_id integer NOT NULL,
  name character varying NOT NULL,
  biography text,
  CONSTRAINT authors_pkey PRIMARY KEY (author_id)
);
CREATE TABLE public.book_authors (
  book_id character varying NOT NULL,
  author_id integer NOT NULL,
  CONSTRAINT book_authors_pkey PRIMARY KEY (book_id, author_id),
  CONSTRAINT book_authors_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(book_id),
  CONSTRAINT book_authors_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.authors(author_id)
);
CREATE TABLE public.book_copies (
  copy_id character varying NOT NULL,
  book_id character varying,
  nfc_uid text NOT NULL,
  status character varying DEFAULT 'Available'::character varying,
  book_condition character varying DEFAULT 'Good'::character varying,
  location character varying DEFAULT 'Main Shelf'::character varying,
  date_added timestamp without time zone DEFAULT now(),
  CONSTRAINT book_copies_pkey PRIMARY KEY (copy_id),
  CONSTRAINT book_copies_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(book_id)
);
CREATE TABLE public.book_requests (
  request_id character varying NOT NULL,
  user_id character varying NOT NULL,
  book_id character varying NOT NULL,
  copy_id character varying,
  request_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  due_date date NOT NULL,
  status character varying DEFAULT 'Pending'::character varying,
  remarks text,
  CONSTRAINT book_requests_pkey PRIMARY KEY (request_id),
  CONSTRAINT book_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id),
  CONSTRAINT book_requests_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(book_id),
  CONSTRAINT book_requests_copy_id_fkey FOREIGN KEY (copy_id) REFERENCES public.book_copies(copy_id)
);
CREATE TABLE public.books (
  book_id character varying NOT NULL,
  isbn character varying,
  title character varying NOT NULL,
  subtitle character varying,
  description text,
  publisher character varying,
  publication_year integer,
  edition character varying,
  category_id integer,
  language character varying DEFAULT 'English'::character varying,
  date_added timestamp without time zone DEFAULT now(),
  available_copies integer DEFAULT 0,
  total_copies integer DEFAULT 0,
  CONSTRAINT books_pkey PRIMARY KEY (book_id),
  CONSTRAINT books_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id)
);
CREATE TABLE public.categories (
  category_id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  category_name character varying NOT NULL UNIQUE,
  category_description text,
  category_type character varying NOT NULL,
  CONSTRAINT categories_pkey PRIMARY KEY (category_id)
);
CREATE TABLE public.inventory_logs (
  log_id character varying NOT NULL,
  copy_id character varying,
  action character varying NOT NULL,
  performed_by character varying DEFAULT 'System'::character varying,
  log_date timestamp without time zone DEFAULT now(),
  CONSTRAINT inventory_logs_pkey PRIMARY KEY (log_id),
  CONSTRAINT inventory_logs_copy_id_fkey FOREIGN KEY (copy_id) REFERENCES public.book_copies(copy_id)
);
CREATE TABLE public.login_history (
  history_id character varying NOT NULL,
  user_id character varying NOT NULL,
  user_type USER-DEFINED NOT NULL,
  ip_address character varying DEFAULT 'Unknown'::character varying,
  user_agent text DEFAULT 'Unknown'::text,
  login_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  logout_time timestamp without time zone,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT login_history_pkey PRIMARY KEY (history_id),
  CONSTRAINT fk_login_user FOREIGN KEY (user_id) REFERENCES public.users(user_id)
);
CREATE TABLE public.scan_requests (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  session_id text,
  status text DEFAULT 'pending'::text,
  nfc_uid text,
  response jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scan_requests_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  user_id character varying NOT NULL,
  user_type USER-DEFINED NOT NULL,
  role USER-DEFINED,
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  gender USER-DEFINED,
  birthday date,
  address text,
  email character varying NOT NULL UNIQUE,
  phone_number character varying,
  student_faculty_id character varying UNIQUE,
  username character varying,
  password_hash character varying NOT NULL,
  nfc_uid character varying UNIQUE,
  status USER-DEFINED NOT NULL DEFAULT 'Active'::user_status_enum,
  date_hired date,
  last_login timestamp without time zone,
  date_registered date DEFAULT CURRENT_DATE,
  created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_pkey PRIMARY KEY (user_id)
);