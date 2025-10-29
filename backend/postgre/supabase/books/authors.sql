create table
    public.authors (
        author_id integer not null,
        name character varying(255) not null,
        biography text null,
        constraint authors_pkey primary key (author_id)
    ) TABLESPACE pg_default;