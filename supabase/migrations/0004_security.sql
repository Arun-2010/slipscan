-- Security hardening.
-- 1. Only real (non-anonymous) accounts can touch data.
-- 2. Items must belong to a receipt the same user owns.
-- 3. Sanity limits on every user-writable column.
-- 4. Scans: block anonymous users and cap total scans per day project-wide.

-- ---------- 1 + 2: policies ----------
-- (select auth.uid()) is evaluated once per query instead of once per row.

drop policy "own settings" on public.settings;
drop policy "own receipts" on public.receipts;
drop policy "own items" on public.receipt_items;
drop policy "own profile" on public.profiles;
drop policy "read own usage" on public.scan_usage;

create policy "own settings" on public.settings
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own receipts" on public.receipts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "own items" on public.receipt_items
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.receipts r
      where r.id = receipt_id and r.user_id = (select auth.uid())
    )
  );

create policy "own profile" on public.profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "read own usage" on public.scan_usage
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Restrictive policies are ANDed with the ones above: anonymous sessions see nothing.
create policy "no anonymous" on public.settings as restrictive for all to authenticated
  using ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true)
  with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);
create policy "no anonymous" on public.receipts as restrictive for all to authenticated
  using ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true)
  with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);
create policy "no anonymous" on public.receipt_items as restrictive for all to authenticated
  using ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true)
  with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);
create policy "no anonymous" on public.profiles as restrictive for all to authenticated
  using ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true)
  with check ((select (auth.jwt() ->> 'is_anonymous')::boolean) is not true);

-- The logged-out (anon) role never needs these tables.
revoke all on public.settings, public.receipts, public.receipt_items, public.profiles, public.scan_usage from anon;
-- Usage counts are written only by claim_scan().
revoke insert, update, delete on public.scan_usage from authenticated;

-- ---------- 3: column limits ----------

alter table public.settings
  add constraint settings_limit_max check (monthly_limit <= 1000000000),  -- ₹1 crore
  add constraint settings_month_fmt check (
    (alert80_month is null or alert80_month ~ '^\d{4}-\d{2}$') and
    (alert100_month is null or alert100_month ~ '^\d{4}-\d{2}$')
  );

alter table public.receipts
  add constraint receipts_shop_len check (char_length(shop) between 1 and 120),
  add constraint receipts_total_max check (total <= 1000000000),           -- ₹1 crore
  add constraint receipts_date_range check (purchased_on between date '2000-01-01' and current_date + 1);

alter table public.receipt_items
  add constraint items_name_len check (char_length(name) between 1 and 120),
  add constraint items_unit_len check (unit is null or char_length(unit) <= 20),
  add constraint items_qty_range check (qty is null or (qty >= 0 and qty <= 100000)),
  add constraint items_price_max check (price <= 1000000000),
  add constraint items_category check (category is null or category in
    ('groceries','veg_fruits','clothing','dining','health','shopping','travel','household','other'));

-- ---------- 4: scan limits ----------

create or replace function public.claim_scan()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
  total integer;
begin
  if auth.uid() is null or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    return false;
  end if;

  -- Project-wide cap so many accounts can't run up the AI bill.
  select coalesce(sum(count), 0) into total from public.scan_usage where day = current_date;
  if total >= 500 then
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
