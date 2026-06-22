-- Phasvy Campus - Supabase schema
-- Run this file in Supabase SQL Editor. It also creates the public storage bucket listing-images.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('user', 'seller', 'admin');
create type public.listing_status as enum ('active', 'sold', 'deleted');

create table public.faculties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text generated always as (lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))) stored,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text generated always as (lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))) stored,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.users (
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

create table public.listings (
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

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  url text not null,
  storage_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reporter_id uuid references public.users(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table public.favorites (
  user_id uuid not null references public.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index listings_search_idx on public.listings using gin (
  to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(description, ''))
);
create index listings_faculty_idx on public.listings(faculty_id);
create index listings_category_idx on public.listings(category_id);
create index listings_seller_idx on public.listings(seller_id);
create index listing_images_listing_idx on public.listing_images(listing_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_users_updated_at
before update on public.users
for each row execute function public.touch_updated_at();

create trigger touch_listings_updated_at
before update on public.listings
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

alter table public.users
add column if not exists avatar_url text;

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

create policy "Public can read active faculties" on public.faculties
for select using (is_active = true or public.is_admin());

create policy "Admins manage faculties" on public.faculties
for all using (public.is_admin()) with check (public.is_admin());

create policy "Public can read active categories" on public.categories
for select using (is_active = true or public.is_admin());

create policy "Admins manage categories" on public.categories
for all using (public.is_admin()) with check (public.is_admin());

create policy "Users read public profiles" on public.users
for select using (true);

create policy "Users update own profile" on public.users
for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Users insert own profile" on public.users
for insert with check (auth.uid() = id);

create policy "Admins update users" on public.users
for update using (public.is_admin()) with check (public.is_admin());

create policy "Anyone reads visible listings" on public.listings
for select using (status in ('active', 'sold') or seller_id = auth.uid() or public.is_admin());

create policy "Authenticated users create listings" on public.listings
for insert with check (
  auth.uid() = seller_id
  and exists (
    select 1 from public.users
    where id = auth.uid()
      and is_blocked = false
  )
);

create policy "Sellers update own listings" on public.listings
for update using (seller_id = auth.uid()) with check (seller_id = auth.uid());

create policy "Admins update any listing" on public.listings
for update using (public.is_admin()) with check (public.is_admin());

create policy "Anyone reads listing images" on public.listing_images
for select using (
  exists (
    select 1 from public.listings
    where listings.id = listing_images.listing_id
      and (listings.status in ('active', 'sold') or listings.seller_id = auth.uid() or public.is_admin())
  )
);

create policy "Sellers add listing images" on public.listing_images
for insert with check (
  exists (
    select 1 from public.listings
    where listings.id = listing_images.listing_id
      and listings.seller_id = auth.uid()
  )
);

create policy "Sellers delete own listing images" on public.listing_images
for delete using (
  exists (
    select 1 from public.listings
    where listings.id = listing_images.listing_id
      and (listings.seller_id = auth.uid() or public.is_admin())
  )
);

create policy "Authenticated users create reports" on public.reports
for insert with check (auth.uid() = reporter_id);

create policy "Admins read reports" on public.reports
for select using (public.is_admin());

create policy "Admins update reports" on public.reports
for update using (public.is_admin()) with check (public.is_admin());

create policy "Users manage own favorites" on public.favorites
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Storage bucket and policies for listing-images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Public read listing images"
on storage.objects for select
using (bucket_id = 'listing-images');

create policy "Authenticated users upload listing images"
on storage.objects for insert
with check (
  bucket_id = 'listing-images'
  and auth.role() = 'authenticated'
  and owner = auth.uid()
);

create policy "Owners delete listing images"
on storage.objects for delete
using (
  bucket_id = 'listing-images'
  and (owner = auth.uid() or public.is_admin())
);

-- Storage bucket and policies for profile avatars.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Public read avatars"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Users upload own avatar"
on storage.objects for insert
with check (
  bucket_id = 'avatars'
  and auth.role() = 'authenticated'
  and owner = auth.uid()
  and (storage.foldername(name))[1] = auth.uid()::text
);

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

create policy "Users delete own avatar"
on storage.objects for delete
using (
  bucket_id = 'avatars'
  and (owner = auth.uid() or public.is_admin())
);

insert into public.faculties (name) values
  ('FIME'),
  ('FACPyA'),
  ('FCFM'),
  ('FARQ'),
  ('FACDyC'),
  ('Medicina'),
  ('Odontologia'),
  ('FAPSI'),
  ('FCQ'),
  ('Psicologia'),
  ('Filosofia y Letras'),
  ('Ciencias Biologicas')
on conflict (name) do nothing;

insert into public.categories (name) values
  ('Libros'),
  ('Tecnologia'),
  ('Ropa'),
  ('Comida'),
  ('Servicios'),
  ('Tutoring'),
  ('Transporte'),
  ('Otros')
on conflict (name) do nothing;

-- To promote your own user after registering:
-- update public.users set role = 'admin' where email = 'tu-correo@example.com';
