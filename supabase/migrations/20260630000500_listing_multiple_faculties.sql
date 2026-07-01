create table if not exists public.listing_faculties (
  listing_id uuid not null references public.listings(id) on delete cascade,
  faculty_id uuid not null references public.faculties(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (listing_id, faculty_id)
);

create index if not exists listing_faculties_faculty_idx
on public.listing_faculties (faculty_id, listing_id);

insert into public.listing_faculties (listing_id, faculty_id)
select id, faculty_id
from public.listings
where faculty_id is not null
on conflict (listing_id, faculty_id) do nothing;

alter table public.listing_faculties enable row level security;

revoke all on public.listing_faculties from anon;
grant select, insert, delete on public.listing_faculties to authenticated;

drop policy if exists "Authenticated users read listing faculties" on public.listing_faculties;
create policy "Authenticated users read listing faculties" on public.listing_faculties
for select to authenticated
using (
  exists (
    select 1
    from public.listings
    where listings.id = listing_faculties.listing_id
  )
);

drop policy if exists "Sellers add listing faculties" on public.listing_faculties;
create policy "Sellers add listing faculties" on public.listing_faculties
for insert to authenticated
with check (
  exists (
    select 1
    from public.listings
    where listings.id = listing_faculties.listing_id
      and (listings.seller_id = auth.uid() or public.is_admin())
  )
);

drop policy if exists "Sellers remove listing faculties" on public.listing_faculties;
create policy "Sellers remove listing faculties" on public.listing_faculties
for delete to authenticated
using (
  exists (
    select 1
    from public.listings
    where listings.id = listing_faculties.listing_id
      and (listings.seller_id = auth.uid() or public.is_admin())
  )
);

do $$
begin
  alter publication supabase_realtime add table public.listing_faculties;
exception when duplicate_object then null;
end
$$;

notify pgrst, 'reload schema';
