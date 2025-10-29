create table
    public.categories (
        category_id integer generated always as identity not null,
        category_name character varying(255) not null,
        category_description text null,
        category_type character varying(20) not null,
        constraint categories_pkey primary key (category_id),
        constraint categories_category_name_key unique (category_name)
    ) TABLESPACE pg_default;