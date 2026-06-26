-- Phasvy Campus - Supabase schema
-- Safe to run more than once in Supabase SQL Editor.
-- Use this when the project was created partially or the schema cache is missing tables.

create extension if not exists "pgcrypto";

do $$
begin
  create type public.user_role as enum ('user', 'seller', 'admin');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.listing_status as enum ('active', 'sold', 'deleted');
exception when duplicate_object then null;
end $$;

create table if not exists public.faculties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text generated always as (lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))) stored,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text generated always as (lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))) stored,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  whatsapp text,
  avatar_url text,
  faculty_id uuid references public.faculties(id) on delete set null,
  role public.user_role not null default 'user',
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users add column if not exists email text;
alter table public.users add column if not exists full_name text;
alter table public.users add column if not exists whatsapp text;
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists faculty_id uuid references public.faculties(id) on delete set null;
alter table public.users add column if not exists role public.user_role not null default 'user';
alter table public.users add column if not exists is_blocked boolean not null default false;
alter table public.users add column if not exists created_at timestamptz not null default now();
alter table public.users add column if not exists updated_at timestamptz not null default now();

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.users(id) on delete cascade,
  faculty_id uuid not null references public.faculties(id),
  category_id uuid not null references public.categories(id),
  title text not null check (char_length(title) between 3 and 120),
  description text not null check (char_length(description) between 10 and 3000),
  price numeric(10, 2) not null check (price >= 0),
  whatsapp text,
  contact_note text,
  status public.listing_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listings add column if not exists seller_id uuid references public.users(id) on delete cascade;
alter table public.listings add column if not exists faculty_id uuid references public.faculties(id);
alter table public.listings add column if not exists category_id uuid references public.categories(id);
alter table public.listings add column if not exists title text;
alter table public.listings add column if not exists description text;
alter table public.listings add column if not exists price numeric(10, 2);
alter table public.listings add column if not exists whatsapp text;
alter table public.listings add column if not exists contact_note text;
alter table public.listings add column if not exists status public.listing_status not null default 'active';
alter table public.listings add column if not exists created_at timestamptz not null default now();
alter table public.listings add column if not exists updated_at timestamptz not null default now();

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  url text not null,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.listing_images add column if not exists listing_id uuid references public.listings(id) on delete cascade;
alter table public.listing_images add column if not exists url text;
alter table public.listing_images add column if not exists storage_path text;
alter table public.listing_images add column if not exists sort_order int not null default 0;
alter table public.listing_images add column if not exists created_at timestamptz not null default now();

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reporter_id uuid references public.users(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references public.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table if not exists public.listing_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reviewer_id uuid not null references public.users(id) on delete cascade,
  seller_id uuid not null references public.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text not null check (char_length(comment) between 12 and 360),
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, reviewer_id),
  check (reviewer_id <> seller_id)
);

alter table public.listing_reviews add column if not exists listing_id uuid references public.listings(id) on delete cascade;
alter table public.listing_reviews add column if not exists reviewer_id uuid references public.users(id) on delete cascade;
alter table public.listing_reviews add column if not exists seller_id uuid references public.users(id) on delete cascade;
alter table public.listing_reviews add column if not exists rating int;
alter table public.listing_reviews add column if not exists comment text;
alter table public.listing_reviews add column if not exists status text not null default 'visible';
alter table public.listing_reviews add column if not exists created_at timestamptz not null default now();
alter table public.listing_reviews add column if not exists updated_at timestamptz not null default now();

create index if not exists listings_search_idx on public.listings using gin (
  to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(description, ''))
);
create index if not exists listings_faculty_idx on public.listings(faculty_id);
create index if not exists listings_category_idx on public.listings(category_id);
create index if not exists listings_seller_idx on public.listings(seller_id);
create index if not exists listing_images_listing_idx on public.listing_images(listing_id);
create index if not exists listing_reviews_listing_idx on public.listing_reviews(listing_id);
create index if not exists listing_reviews_seller_idx on public.listing_reviews(seller_id);
create unique index if not exists listing_reviews_listing_reviewer_idx on public.listing_reviews(listing_id, reviewer_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_users_updated_at on public.users;
create trigger touch_users_updated_at
before update on public.users
for each row execute function public.touch_updated_at();

drop trigger if exists touch_listings_updated_at on public.listings;
create trigger touch_listings_updated_at
before update on public.listings
for each row execute function public.touch_updated_at();

drop trigger if exists touch_listing_reviews_updated_at on public.listing_reviews;
create trigger touch_listing_reviews_updated_at
before update on public.listing_reviews
for each row execute function public.touch_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role = 'admin'
      and is_blocked = false
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, whatsapp, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'whatsapp',
    case when new.raw_user_meta_data ->> 'role' = 'seller' then 'seller'::public.user_role else 'user'::public.user_role end
  )
  on conflict (id) do update
      set email = excluded.email,
      full_name = coalesce(public.users.full_name, excluded.full_name),
      whatsapp = coalesce(public.users.whatsapp, excluded.whatsapp),
      role = coalesce(public.users.role, excluded.role);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.faculties enable row level security;
alter table public.categories enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.reports enable row level security;
alter table public.favorites enable row level security;
alter table public.listing_reviews enable row level security;

drop policy if exists "Public can read active faculties" on public.faculties;
create policy "Public can read active faculties" on public.faculties
for select using (is_active = true or public.is_admin());

drop policy if exists "Admins manage faculties" on public.faculties;
create policy "Admins manage faculties" on public.faculties
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public can read active categories" on public.categories;
create policy "Public can read active categories" on public.categories
for select using (is_active = true or public.is_admin());

drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories" on public.categories
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Users read public profiles" on public.users;
create policy "Users read public profiles" on public.users
for select using (true);

drop policy if exists "Users insert own profile" on public.users;
create policy "Users insert own profile" on public.users
for insert with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.users;
create policy "Users update own profile" on public.users
for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Admins update users" on public.users;
create policy "Admins update users" on public.users
for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Anyone reads visible listings" on public.listings;
create policy "Anyone reads visible listings" on public.listings
for select using (status in ('active', 'sold') or seller_id = auth.uid() or public.is_admin());

drop policy if exists "Authenticated users create listings" on public.listings;
create policy "Authenticated users create listings" on public.listings
for insert with check (
  auth.uid() = seller_id
  and exists (
    select 1 from public.users
    where id = auth.uid()
      and is_blocked = false
  )
);

drop policy if exists "Sellers update own listings" on public.listings;
create policy "Sellers update own listings" on public.listings
for update using (seller_id = auth.uid()) with check (seller_id = auth.uid());

drop policy if exists "Admins update any listing" on public.listings;
create policy "Admins update any listing" on public.listings
for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Anyone reads listing images" on public.listing_images;
create policy "Anyone reads listing images" on public.listing_images
for select using (true);

drop policy if exists "Sellers add listing images" on public.listing_images;
create policy "Sellers add listing images" on public.listing_images
for insert with check (
  exists (
    select 1 from public.listings
    where listings.id = listing_images.listing_id
      and listings.seller_id = auth.uid()
  )
);

drop policy if exists "Sellers delete own listing images" on public.listing_images;
create policy "Sellers delete own listing images" on public.listing_images
for delete using (
  exists (
    select 1 from public.listings
    where listings.id = listing_images.listing_id
      and (listings.seller_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Authenticated users create reports" on public.reports;
create policy "Authenticated users create reports" on public.reports
for insert with check (auth.uid() = reporter_id);

drop policy if exists "Admins read reports" on public.reports;
create policy "Admins read reports" on public.reports
for select using (public.is_admin());

drop policy if exists "Admins update reports" on public.reports;
create policy "Admins update reports" on public.reports
for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Users manage own favorites" on public.favorites;
create policy "Users manage own favorites" on public.favorites
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Anyone reads visible listing reviews" on public.listing_reviews;
create policy "Anyone reads visible listing reviews" on public.listing_reviews
for select using (status = 'visible' or reviewer_id = auth.uid() or public.is_admin());

drop policy if exists "Authenticated users create listing reviews" on public.listing_reviews;
create policy "Authenticated users create listing reviews" on public.listing_reviews
for insert with check (
  auth.uid() = reviewer_id
  and status = 'visible'
  and char_length(comment) between 12 and 360
  and comment !~* '(https?://|www\.|bit\.ly|wa\.me|t\.me)'
  and exists (
    select 1 from public.listings
    where listings.id = listing_reviews.listing_id
      and listings.seller_id = listing_reviews.seller_id
      and listings.seller_id <> auth.uid()
      and listings.status in ('active', 'sold')
  )
);

drop policy if exists "Reviewers update own listing reviews" on public.listing_reviews;
create policy "Reviewers update own listing reviews" on public.listing_reviews
for update using (reviewer_id = auth.uid()) with check (
  reviewer_id = auth.uid()
  and status = 'visible'
  and char_length(comment) between 12 and 360
  and comment !~* '(https?://|www\.|bit\.ly|wa\.me|t\.me)'
  and exists (
    select 1 from public.listings
    where listings.id = listing_reviews.listing_id
      and listings.seller_id = listing_reviews.seller_id
      and listings.seller_id <> auth.uid()
      and listings.status in ('active', 'sold')
  )
);

drop policy if exists "Admins moderate listing reviews" on public.listing_reviews;
create policy "Admins moderate listing reviews" on public.listing_reviews
for update using (public.is_admin()) with check (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-images', 'listing-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read listing images" on storage.objects;
create policy "Public read listing images"
on storage.objects for select
using (bucket_id = 'listing-images');

drop policy if exists "Authenticated users upload listing images" on storage.objects;
create policy "Authenticated users upload listing images"
on storage.objects for insert
with check (
  bucket_id = 'listing-images'
  and auth.role() = 'authenticated'
  and owner = auth.uid()
);

drop policy if exists "Owners delete listing images" on storage.objects;
create policy "Owners delete listing images"
on storage.objects for delete
using (
  bucket_id = 'listing-images'
  and (owner = auth.uid() or public.is_admin())
);

drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and auth.role() = 'authenticated'
  and owner = auth.uid()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users update own avatar" on storage.objects;
create policy "Users update own avatar"
on storage.objects for update
using (
  bucket_id = 'avatars'
  and owner = auth.uid()
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and owner = auth.uid()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users delete own avatar" on storage.objects;
create policy "Users delete own avatar"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and (owner = auth.uid() or public.is_admin())
);

insert into public.faculties (name) values
  ('FIME'), ('FACPyA'), ('FACDyC'), ('Medicina'), ('FAPSI'), ('FARQ'), ('Odontologia'), ('FCQ'),
  ('FCFM'), ('Psicologia'), ('Filosofia y Letras'), ('Ciencias Biologicas')
on conflict (name) do nothing;

insert into public.categories (name) values
  ('Bebidas'), ('Comidas'), ('Postres'), ('Libros'), ('Tecnologia'), ('Ropa'), ('Comida'),
  ('Servicios'), ('Tutoring'), ('Transporte'), ('Otros')
on conflict (name) do nothing;

notify pgrst, 'reload schema';

-- To promote your own user after registering:
-- update public.users set role = 'admin' where email = 'tu-correo@example.com';
