delete from private.allowed_origins
where origin = 'https://phasvy-campus.pages.dev';

insert into private.allowed_origins (origin, is_active)
values ('https://phasvyuanl.pages.dev', true)
on conflict (origin) do update
set is_active = excluded.is_active;
