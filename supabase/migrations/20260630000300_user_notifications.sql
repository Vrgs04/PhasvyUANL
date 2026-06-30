create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 100),
  message text not null check (char_length(message) between 3 and 1000),
  notification_type text not null default 'info' check (notification_type in ('info', 'success', 'warning', 'business')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx
on public.notifications (recipient_id, created_at desc);

alter table public.notifications enable row level security;

revoke all on public.notifications from anon;
revoke update on public.notifications from authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications
for select to authenticated
using (recipient_id = auth.uid());

drop policy if exists "Users mark own notifications read" on public.notifications;
create policy "Users mark own notifications read" on public.notifications
for update to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

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

  insert into public.notifications (recipient_id, title, message, notification_type)
  values (
    updated_user.id,
    'Solicitud recibida',
    'Tu negocio está en espera de validación. Te avisaremos aquí cuando el administrador termine la revisión.',
    'business'
  );

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

  insert into public.notifications (recipient_id, title, message, notification_type)
  values (
    updated_user.id,
    case when approve then '¡Tu negocio fue aprobado!' else 'Actualización de tu solicitud' end,
    case
      when approve then 'Ya formas parte de los vendedores de Phasvy. Ahora puedes crear y administrar publicaciones.'
      else 'Tu negocio no fue aprobado en esta revisión.' ||
        case when nullif(trim(coalesce(review_note, '')), '') is not null then ' Motivo: ' || public.clean_user_text(review_note, 500) else '' end
    end,
    case when approve then 'success' else 'warning' end
  );

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
  previous_role public.user_role;
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

  select role into previous_role from public.users where id = target_id;

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

  if previous_role is distinct from updated_user.role then
    insert into public.notifications (recipient_id, title, message, notification_type)
    values (
      updated_user.id,
      case when new_role = 'seller' then 'Ahora eres vendedor' else 'Tu rol fue actualizado' end,
      case
        when new_role = 'seller' then 'El administrador te dio permisos de vendedor. Ya puedes publicar productos.'
        when new_role = 'admin' then 'Ahora tienes permisos de administrador en Phasvy.'
        when new_role = 'user' then 'Tu cuenta ahora tiene el rol Cliente.'
        else 'Tu cuenta quedó sin permisos de cliente o vendedor.'
      end,
      case when new_role in ('seller', 'admin') then 'success' else 'info' end
    );
  end if;

  return updated_user;
end;
$$;

create or replace function public.admin_send_notification(
  p_title text,
  p_message text,
  p_audience text default 'all'
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator permission required';
  end if;

  if p_audience not in ('all', 'clients', 'sellers') then
    raise exception 'Invalid audience';
  end if;

  if char_length(trim(coalesce(p_title, ''))) < 3
    or char_length(trim(coalesce(p_message, ''))) < 3 then
    raise exception 'Title and message are required';
  end if;

  insert into public.notifications (recipient_id, title, message, notification_type)
  select
    id,
    public.clean_user_text(p_title, 100),
    public.clean_user_text(p_message, 1000),
    'info'
  from public.users
  where is_blocked = false
    and (
      (p_audience = 'all' and role in ('user', 'seller'))
      or (p_audience = 'clients' and role = 'user')
      or (p_audience = 'sellers' and role = 'seller')
    );

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.admin_send_notification(text, text, text) from public, anon;
grant execute on function public.admin_send_notification(text, text, text) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end
$$;

notify pgrst, 'reload schema';
