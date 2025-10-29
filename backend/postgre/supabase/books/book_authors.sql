create table
    public.book_authors (
        book_id character varying(11) not null,
        author_id integer not null,
        constraint book_authors_pkey primary key (book_id, author_id),
        constraint book_authors_author_id_fkey foreign KEY (author_id) references authors (author_id),
        constraint book_authors_book_id_fkey foreign KEY (book_id) references books (book_id)
    ) TABLESPACE pg_default;