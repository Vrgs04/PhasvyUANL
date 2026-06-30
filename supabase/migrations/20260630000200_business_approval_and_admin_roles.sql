do $$
begin
  create type public.business_validation_status as enum ('not_requested', 'pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end
$$;

alter table public.users
  add column if not exists business_status public.business_validation_status not null default 'not_requested',
  add column if not exists business_submitted_at timestamptz,
  add column if not exists business_reviewed_at timestamptz,
  add column if not exists business_reviewed_by uuid references public.users(id) on delete set null,
  add column if not exists business_review_note text;

update public.users
set business_status = 'approved'
where role in ('seller', 'admin')
  and business_status = 'not_requested';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wants_to_sell boolean := new.raw_user_meta_data ->> 'role' = 'seller';
begin
  insert into public.users (
    id,
    email,
    full_name,
    whatsapp,
    business_name,
    business_description,
    role,
    business_status,
    business_submitted_at
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'whatsapp',
    nullif(new.raw_user_meta_data ->> 'business_name', ''),
    nullif(new.raw_user_meta_data ->> 'business_description', ''),
    case when lower(new.email) = 'phasvyadmin@gmail.com' then 'admin'::public.user_role else 'user'::public.user_role end,
    case
      when lower(new.email) = 'phasvyadmin@gmail.com' then 'approved'::public.business_validation_status
      when wants_to_sell then 'pending'::public.business_validation_status
      else 'not_requested'::public.business_validation_status
    end,
    case when wants_to_sell then now() else null end
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(public.users.full_name, excluded.full_name),
      whatsapp = coalesce(public.users.whatsapp, excluded.whatsapp),
      business_name = coalesce(public.users.business_name, excluded.business_name),
      business_description = coalesce(public.users.business_description, excluded.business_description),
      role = case
        when lower(new.email) = 'phasvyadmin@gmail.com' then 'admin'::public.user_role
        else public.users.role
      end,
      business_status = case
        when lower(new.email) = 'phasvyadmin@gmail.com' then 'approved'::public.business_validation_status
        when public.users.role in ('seller', 'admin') then public.users.business_status
        else excluded.business_status
      end,
      business_submitted_at = coalesce(public.users.business_submitted_at, excluded.business_submitted_at);
  return new;
end;
$$;

update public.users
set role = 'admin',
    business_status = 'approved',
    is_blocked = false
where lower(email) = 'phasvyadmin@gmail.com';

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
    new.business_status := 'not_requested';
    new.business_submitted_at := null;
    new.business_reviewed_at := null;
    new.business_reviewed_by := null;
    new.business_review_note := null;
  elsif tg_op = 'UPDATE' and auth.uid() is not null and not public.is_admin() then
    new.id := old.id;
    new.email := old.email;
    new.role := old.role;
    new.is_blocked := old.is_blocked;
    new.business_status := old.business_status;
    new.business_submitted_at := old.business_submitted_at;
    new.business_reviewed_at := old.business_reviewed_at;
    new.business_reviewed_by := old.business_reviewed_by;
    new.business_review_note := old.business_review_note;
    new.created_at := old.created_at;
  end if;

  new.full_name := public.clean_user_text(new.full_name, 120);
  new.business_name := nullif(public.clean_user_text(new.business_name, 100), '');
  new.business_description := nullif(public.clean_user_text(new.business_description, 600), '');
  new.business_review_note := nullif(public.clean_user_text(new.business_review_note, 500), '');
  new.whatsapp := regexp_replace(coalesce(new.whatsapp, ''), '[^0-9]', '', 'g');
  return new;
end;
$$;

create or replace function public.submit_business_application(p_business_name text, p_business_description text)
returns public.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_user public.users;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if char_length(trim(coalesce(p_business_name, ''))) < 3 then
    raise exception 'Business name must have at least 3 characters';
  end if;

  if char_length(trim(coalesce(p_business_description, ''))) < 20 then
    raise exception 'Business description must have at least 20 characters';
  end if;

  update public.users
  set business_name = public.clean_user_text(p_business_name, 100),
      business_description = public.clean_user_text(p_business_description, 600),
      business_status = 'pending',
      business_submitted_at = now(),
      business_reviewed_at = null,
      business_reviewed_by = null,
      business_review_note = null
  where id = auth.uid()
    and role not in ('seller', 'admin')
    and is_blocked = false
  returning * into updated_user;

  if updated_user.id is null then
    raise exception 'This account cannot submit a business application';
  end if;

  return updated_user;
end;
$$;

create or replace function public.review_business_application(
  applicant_id uuid,
  approve boolean,
  review_note text default null
)
returns public.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_user public.users;
begin
  if not public.is_admin() then
    raise exception 'Administrator permission required';
  end if;

  update public.users
  set role = case when approve then 'seller'::public.user_role else 'user'::public.user_role end,
      business_status = case
        when approve then 'approved'::public.business_validation_status
        else 'rejected'::public.business_validation_status
      end,
      business_reviewed_at = now(),
      business_reviewed_by = auth.uid(),
      business_review_note = nullif(public.clean_user_text(review_note, 500), '')
  where id = applicant_id
    and business_status = 'pending'
  returning * into updated_user;

  if updated_user.id is null then
    raise exception 'Pending business application not found';
  end if;

  return updated_user;
end;
$$;

create or replace function public.admin_set_user_role(target_id uuid, new_role text)
returns public.users
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_user public.users;
begin
  if not public.is_admin() then
    raise exception 'Administrator permission required';
  end if;

  if new_role not in ('guest', 'user', 'seller', 'admin') then
    raise exception 'Invalid role';
  end if;

  if target_id = auth.uid() and new_role <> 'admin' then
    raise exception 'You cannot remove your own administrator role';
  end if;

  update public.users
  set role = new_role::public.user_role,
      business_status = case
        when new_role in ('seller', 'admin') then 'approved'::public.business_validation_status
        when business_status = 'approved' then 'not_requested'::public.business_validation_status
        else business_status
      end,
      business_reviewed_at = case when new_role in ('seller', 'admin') then now() else business_reviewed_at end,
      business_reviewed_by = case when new_role in ('seller', 'admin') then auth.uid() else business_reviewed_by end
  where id = target_id
  returning * into updated_user;

  if updated_user.id is null then
    raise exception 'User not found';
  end if;

  return updated_user;
end;
$$;

revoke all on function public.submit_business_application(text, text) from public, anon;
grant execute on function public.submit_business_application(text, text) to authenticated;
revoke all on function public.review_business_application(uuid, boolean, text) from public, anon;
grant execute on function public.review_business_application(uuid, boolean, text) to authenticated;
revoke all on function public.admin_set_user_role(uuid, text) from public, anon;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

drop policy if exists "Anyone reads visible listings" on public.listings;
create policy "Anyone reads visible listings" on public.listings
for select to authenticated
using (
  (
    status in ('active', 'sold')
    and exists (
      select 1
      from public.users
      where users.id = auth.uid()
        and users.role <> 'guest'
        and users.is_blocked = false
    )
  )
  or seller_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "Authenticated users create listings" on public.listings;
create policy "Authenticated users create listings" on public.listings
for insert to authenticated
with check (
  auth.uid() = seller_id
  and exists (
    select 1
    from public.users
    where id = auth.uid()
      and is_blocked = false
      and (
        role = 'admin'
        or (role = 'seller' and business_status = 'approved')
      )
  )
);

notify pgrst, 'reload schema';
