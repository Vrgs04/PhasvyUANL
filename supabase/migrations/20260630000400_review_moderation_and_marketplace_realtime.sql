alter table public.listing_reviews
  alter column status set default 'pending';

alter table public.listing_reviews
  drop constraint if exists listing_reviews_status_check;

alter table public.listing_reviews
  add constraint listing_reviews_status_check
  check (status in ('pending', 'visible', 'rejected', 'hidden'));

drop policy if exists "Authenticated users create listing reviews" on public.listing_reviews;
create policy "Authenticated users create listing reviews" on public.listing_reviews
for insert to authenticated
with check (
  auth.uid() = reviewer_id
  and status = 'pending'
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
for update to authenticated
using (reviewer_id = auth.uid())
with check (
  reviewer_id = auth.uid()
  and status = 'pending'
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

create or replace function public.admin_review_listing_review(
  p_review_id uuid,
  p_approve boolean
)
returns public.listing_reviews
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewed public.listing_reviews;
begin
  if not public.is_admin() then
    raise exception 'Administrator permission required';
  end if;

  update public.listing_reviews
  set status = case when p_approve then 'visible' else 'rejected' end,
      updated_at = now()
  where id = p_review_id
    and status = 'pending'
  returning * into reviewed;

  if reviewed.id is null then
    raise exception 'Pending review not found';
  end if;

  insert into public.notifications (recipient_id, title, message, notification_type)
  values (
    reviewed.reviewer_id,
    case when p_approve then 'Reseña aprobada' else 'Reseña no aprobada' end,
    case
      when p_approve then 'Tu reseña ya es visible para la comunidad.'
      else 'Tu reseña no cumplió con las reglas de publicación.'
    end,
    case when p_approve then 'success' else 'warning' end
  );

  return reviewed;
end;
$$;

revoke all on function public.admin_review_listing_review(uuid, boolean) from public, anon;
grant execute on function public.admin_review_listing_review(uuid, boolean) to authenticated;

create or replace function public.delete_listing(p_listing_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  delete from public.listings
  where id = p_listing_id
    and (seller_id = auth.uid() or public.is_admin())
  returning id into deleted_id;

  if deleted_id is null then
    raise exception 'Listing not found or permission denied';
  end if;

  return true;
end;
$$;

revoke all on function public.delete_listing(uuid) from public, anon;
grant execute on function public.delete_listing(uuid) to authenticated;

create or replace function public.notify_admins_new_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (recipient_id, title, message, notification_type)
  select
    id,
    'Nueva publicación',
    'Se publicó "' || public.clean_user_text(new.title, 120) || '". Revísala desde el panel administrador.',
    'info'
  from public.users
  where role = 'admin'
    and is_blocked = false;
  return new;
end;
$$;

drop trigger if exists notify_admins_after_listing_insert on public.listings;
create trigger notify_admins_after_listing_insert
after insert on public.listings
for each row execute function public.notify_admins_new_listing();

create or replace function public.notify_admins_pending_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'pending' then
    insert into public.notifications (recipient_id, title, message, notification_type)
    select
      id,
      'Reseña pendiente',
      'Hay una nueva reseña esperando moderación.',
      'warning'
    from public.users
    where role = 'admin'
      and is_blocked = false;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_admins_after_review_write on public.listing_reviews;
create trigger notify_admins_after_review_write
after insert or update of status on public.listing_reviews
for each row
when (new.status = 'pending')
execute function public.notify_admins_pending_review();

do $$
begin
  alter publication supabase_realtime add table public.listings;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table public.listing_images;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter publication supabase_realtime add table public.listing_reviews;
exception when duplicate_object then null;
end
$$;

notify pgrst, 'reload schema';
