-- Phasvy Campus security hardening
-- Run once in Supabase SQL Editor after schema.sql or repair-current-project.sql.
-- Update the production origin below if the Cloudflare custom domain changes.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Explicit CORS allowlist used by the Data API pre-request hook.
create table if not exists private.allowed_origins (
  origin text primary key,
  is_active boolean not null default true
);

insert into private.allowed_origins (origin) values
  ('https://phasvy-campus.pages.dev'),
  ('http://localhost:5173'),
  ('http://127.0.0.1:5173')
on conflict (origin) do nothing;

-- Per-user (or per-IP before login) write request log.
create table if not exists private.rate_limits (
  request_key text not null,
  request_at timestamptz not null default now()
);

create index if not exists rate_limits_key_request_at_idx
on private.rate_limits (request_key, request_at desc);

create or replace function public.check_api_request()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  req_method text := current_setting('request.method', true);
  req_headers jsonb := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  req_origin text;
  req_ip text;
  req_user text;
  req_key text;
  requests_last_minute integer;
begin
  req_origin := req_headers->>'origin';

  if req_origin is not null and not exists (
    select 1
    from private.allowed_origins
    where is_active = true and origin = req_origin
  ) then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code', 'ORIGIN_NOT_ALLOWED',
        'message', 'Origin not allowed',
        'details', req_origin,
        'hint', 'Add the production origin to private.allowed_origins')::text,
      detail = json_build_object('status', 403, 'status_text', 'Forbidden')::text;
  end if;

  if req_method in ('GET', 'HEAD', 'OPTIONS') or req_method is null then
    return;
  end if;

  req_user := auth.uid()::text;
  req_ip := split_part(coalesce(req_headers->>'x-forwarded-for', 'unknown'), ',', 1);
  req_key := coalesce(req_user, req_ip);

  select count(*) into requests_last_minute
  from private.rate_limits
  where request_key = req_key
    and request_at >= now() - interval '1 minute';

  if requests_last_minute >= 60 then
    raise sqlstate 'PGRST' using
      message = json_build_object(
        'code', 'RATE_LIMITED',
        'message', 'Demasiadas solicitudes. Intenta de nuevo en un minuto.',
        'details', 'Maximum 60 write requests per minute',
        'hint', 'Wait before retrying')::text,
      detail = json_build_object(
        'status', 429,
        'status_text', 'Too Many Requests',
        'headers', json_build_object('Retry-After', '60'))::text;
  end if;

  insert into private.rate_limits (request_key) values (req_key);
  delete from private.rate_limits where request_at < now() - interval '10 minutes';
end;
$$;

revoke execute on function public.check_api_request() from public;
grant execute on function public.check_api_request() to anon, authenticated;

alter role authenticator set pgrst.db_pre_request = 'public.check_api_request';
notify pgrst, 'reload config';

-- Only the owner (or an admin) can read a full user profile.
alter table public.users enable row level security;
drop policy if exists "Users read public profiles" on public.users;
drop policy if exists "Users read own profile" on public.users;
create policy "Users read own profile" on public.users
for select to authenticated
using ((select auth.uid()) = id or public.is_admin());

drop policy if exists "Users insert own profile" on public.users;
create policy "Users insert own profile" on public.users
for insert to authenticated
with check ((select auth.uid()) = id);

drop policy if exists "Users update own profile" on public.users;
create policy "Users update own profile" on public.users
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Public seller projection: deliberately excludes email, WhatsApp, role and blocked state.
create or replace function public.get_public_seller_profiles(seller_ids uuid[])
returns table (
  id uuid,
  full_name text,
  avatar_url text,
  business_name text,
  business_description text
)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.full_name, u.avatar_url, u.business_name, u.business_description
  from public.users u
  where u.id = any(seller_ids)
    and u.is_blocked = false
    and auth.uid() is not null;
$$;

revoke all on function public.get_public_seller_profiles(uuid[]) from public, anon;
grant execute on function public.get_public_seller_profiles(uuid[]) to authenticated;

-- Exposed marketplace tables require authentication and retain ownership checks.
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.listing_reviews enable row level security;
alter table public.reports enable row level security;
alter table public.favorites enable row level security;

revoke all on public.users, public.listings, public.listing_images, public.listing_reviews, public.reports, public.favorites from anon;
grant select, insert, update on public.users to authenticated;
grant select, insert, update, delete on public.listings, public.listing_images, public.listing_reviews, public.reports, public.favorites to authenticated;

-- Sanitize stored text as a second line of defense. Supabase/PostgREST already parameterizes SQL.
create or replace function public.clean_user_text(value text, max_length integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select left(
    trim(regexp_replace(regexp_replace(coalesce(value, ''), '[<>]', '', 'g'), '[[:cntrl:]]', ' ', 'g')),
    max_length
  );
$$;

revoke execute on function public.clean_user_text(text, integer) from public, anon, authenticated;

create or replace function public.sanitize_user_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and auth.uid() is not null and not public.is_admin() then
    new.role := 'user';
    new.is_blocked := false;
  elsif tg_op = 'UPDATE' and auth.uid() is not null and not public.is_admin() then
    new.id := old.id;
    new.email := old.email;
    new.role := old.role;
    new.is_blocked := old.is_blocked;
    new.created_at := old.created_at;
  end if;

  new.full_name := public.clean_user_text(new.full_name, 120);
  new.business_name := nullif(public.clean_user_text(new.business_name, 100), '');
  new.business_description := nullif(public.clean_user_text(new.business_description, 600), '');
  new.whatsapp := regexp_replace(coalesce(new.whatsapp, ''), '[^0-9]', '', 'g');
  return new;
end;
$$;

create or replace function public.sanitize_listing_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.title := public.clean_user_text(new.title, 120);
  new.description := public.clean_user_text(new.description, 3000);
  new.contact_note := nullif(public.clean_user_text(new.contact_note, 300), '');
  new.whatsapp := regexp_replace(coalesce(new.whatsapp, ''), '[^0-9]', '', 'g');
  return new;
end;
$$;

create or replace function public.sanitize_review_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.comment := public.clean_user_text(new.comment, 360);
  return new;
end;
$$;

drop trigger if exists sanitize_users_before_write on public.users;
create trigger sanitize_users_before_write
before insert or update on public.users
for each row execute function public.sanitize_user_row();

drop trigger if exists sanitize_listings_before_write on public.listings;
create trigger sanitize_listings_before_write
before insert or update on public.listings
for each row execute function public.sanitize_listing_row();

drop trigger if exists sanitize_reviews_before_write on public.listing_reviews;
create trigger sanitize_reviews_before_write
before insert or update on public.listing_reviews
for each row execute function public.sanitize_review_row();

-- Database-enforced maximum; the UI enforces at least one image before saving.
create or replace function public.enforce_listing_image_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*)
    from public.listing_images
    where listing_id = new.listing_id
  ) >= 6 then
    raise exception 'A listing can have at most 6 images';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_listing_image_limit_before_insert on public.listing_images;
create trigger enforce_listing_image_limit_before_insert
before insert on public.listing_images
for each row execute function public.enforce_listing_image_limit();

-- Server-side allowlist for new Auth users.
create or replace function public.hook_restrict_signup_email_domain(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  email_domain text := lower(split_part(event->'user'->>'email', '@', 2));
begin
  if email_domain = any(array[
    'gmail.com',
    'hotmail.com',
    'outlook.com',
    'uanl.edu.mx',
    'yahoo.com',
    'icloud.com'
  ]) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 400,
      'message', 'Usa un correo de Gmail, Hotmail, Outlook, UANL, Yahoo o iCloud.'
    )
  );
end;
$$;

grant execute on function public.hook_restrict_signup_email_domain(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_restrict_signup_email_domain(jsonb) from public, anon, authenticated;

notify pgrst, 'reload schema';
