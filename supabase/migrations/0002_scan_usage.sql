-- Daily scan counter for the scan-bill abuse guard (max 30 scans per user per day).
create table public.scan_usage (
  user_id  uuid not null default auth.uid() references auth.users on delete cascade,
  day      date not null default current_date,
  count    integer not null default 0,
  primary key (user_id, day)
);

-- RLS on with read-only access: users can see their usage but not reset it.
alter table public.scan_usage enable row level security;
create policy "read own usage" on public.scan_usage
  for select using (auth.uid() = user_id);

-- Atomically counts one scan for the calling user; returns false once over the daily cap.
create function public.claim_scan()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if auth.uid() is null then
    return false;
  end if;
  insert into public.scan_usage (user_id, day, count)
  values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set count = public.scan_usage.count + 1
  returning count into n;
  return n <= 30;
end;
$$;

revoke execute on function public.claim_scan() from public, anon;
grant execute on function public.claim_scan() to authenticated;
