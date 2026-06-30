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
    raise sqlstate 'PT403' using
      message = 'Origin not allowed',
      detail = req_origin,
      hint = 'Add the production origin to private.allowed_origins';
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
    raise sqlstate 'PT429' using
      message = 'Demasiadas solicitudes. Intenta de nuevo en un minuto.',
      detail = 'Maximum 60 write requests per minute',
      hint = 'Wait before retrying';
  end if;

  insert into private.rate_limits (request_key) values (req_key);
  delete from private.rate_limits where request_at < now() - interval '10 minutes';
end;
$$;

revoke execute on function public.check_api_request() from public;
grant execute on function public.check_api_request() to anon, authenticated;

notify pgrst, 'reload config';
