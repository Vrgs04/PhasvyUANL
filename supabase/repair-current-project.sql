-- Run this in Supabase SQL Editor if the live site says:
-- "Could not find the table 'public.listings' in the schema cache"
-- This migration is safe to run on an existing project.

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

alter table public.users add column if not exists avatar_url text;

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

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  url text not null,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
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

insert into public.faculties (name) values
  ('FIME'), ('FACPyA'), ('FACDyC'), ('Medicina'), ('FAPSI'), ('FARQ'), ('Odontologia'), ('FCQ')
on conflict (name) do nothing;

insert into public.categories (name) values
  ('Bebidas'), ('Comidas'), ('Postres'), ('Libros'), ('Tecnologia'), ('Servicios')
on conflict (name) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, whatsapp)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'whatsapp'
  )
  on conflict (id) do nothing;
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
alter table public.listing_reviews enable row level security;

drop policy if exists "Users read public profiles" on public.users;
create policy "Users read public profiles" on public.users
for select using (true);

drop policy if exists "Users insert own profile" on public.users;
create policy "Users insert own profile" on public.users
for insert with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.users;
create policy "Users update own profile" on public.users
for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Public can read active faculties" on public.faculties;
create policy "Public can read active faculties" on public.faculties
for select using (is_active = true);

drop policy if exists "Public can read active categories" on public.categories;
create policy "Public can read active categories" on public.categories
for select using (is_active = true);

drop policy if exists "Anyone reads visible listings" on public.listings;
create policy "Anyone reads visible listings" on public.listings
for select using (status in ('active', 'sold') or seller_id = auth.uid());

drop policy if exists "Authenticated users create listings" on public.listings;
create policy "Authenticated users create listings" on public.listings
for insert with check (auth.uid() = seller_id);

drop policy if exists "Sellers update own listings" on public.listings;
create policy "Sellers update own listings" on public.listings
for update using (seller_id = auth.uid()) with check (seller_id = auth.uid());

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

drop policy if exists "Anyone reads visible listing reviews" on public.listing_reviews;
create policy "Anyone reads visible listing reviews" on public.listing_reviews
for select using (status = 'visible' or reviewer_id = auth.uid());

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
);

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

notify pgrst, 'reload schema';
