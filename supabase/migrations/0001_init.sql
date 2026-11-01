create table public.settings (
  user_id        uuid primary key default auth.uid() references auth.users on delete cascade,
  monthly_limit  integer not null default 800000 check (monthly_limit > 0),
  alert_80       boolean not null default true,
  alert_100      boolean not null default true,
  alert80_month  text,          -- 'YYYY-MM' when the 80% alert was last sent
  alert100_month text,
  created_at     timestamptz not null default now()
);

create table public.receipts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users on delete cascade,
  shop           text not null,
  purchased_on   date not null,
  total          integer not null check (total >= 0),
  category       text not null check (category in
                   ('groceries','veg_fruits','clothing','dining','health','shopping','travel','household','other')),
  payment_method text check (payment_method in ('cash','upi','card')),
  source         text not null check (source in ('scan','manual')),
  created_at     timestamptz not null default now()
);
create index receipts_user_date on public.receipts (user_id, purchased_on desc);

create table public.receipt_items (
  id          uuid primary key default gen_random_uuid(),
  receipt_id  uuid not null references public.receipts on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  name        text not null,
  qty         numeric,
  unit        text,
  price       integer not null check (price >= 0),
  category    text
);
create index items_receipt on public.receipt_items (receipt_id);
create index items_user_name on public.receipt_items (user_id, lower(name));

-- Row Level Security: each (anonymous) user sees only their own rows
alter table public.settings      enable row level security;
alter table public.receipts      enable row level security;
alter table public.receipt_items enable row level security;

create policy "own settings" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own receipts" on public.receipts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own items" on public.receipt_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
