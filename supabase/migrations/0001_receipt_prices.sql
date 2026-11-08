-- Shared food prices from scanned receipts.
-- Anonymous on purpose: no user id, no device id — only store, city, food and price.

create table if not exists public.receipt_prices (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  receipt_date date,
  chain text not null check (
    chain in ('konzum', 'lidl', 'kaufland', 'spar', 'plodine', 'tommy', 'studenac', 'eurospin', 'ribola', 'ntl')
  ),
  city text check (city is null or char_length(city) between 2 and 60),
  food_id text not null check (food_id ~ '^[a-z_]{2,30}$'),
  -- € per kg of the food as the app counts it (edible weight)
  price_per_kg numeric(8, 2) not null check (price_per_kg > 0.1 and price_per_kg < 200)
);

create index if not exists receipt_prices_lookup on public.receipt_prices (city, chain, food_id, created_at desc);

alter table public.receipt_prices enable row level security;

drop policy if exists "Anyone can add a receipt price" on public.receipt_prices;
create policy "Anyone can add a receipt price" on public.receipt_prices
  for insert to anon, authenticated with check (true);

drop policy if exists "Anyone can read receipt prices" on public.receipt_prices;
create policy "Anyone can read receipt prices" on public.receipt_prices
  for select to anon, authenticated using (true);

grant select, insert on public.receipt_prices to anon, authenticated;

-- Median price per city / store / food over the last 60 days.
-- The app only trusts a price once at least 2 receipts agree on it.
create or replace view public.community_prices
with (security_invoker = true) as
select
  city,
  chain,
  food_id,
  round(percentile_cont(0.5) within group (order by price_per_kg)::numeric, 2) as price_per_kg,
  count(*) as reports,
  max(coalesce(receipt_date, created_at::date)) as last_seen
from public.receipt_prices
where created_at > now() - interval '60 days'
group by city, chain, food_id;

grant select on public.community_prices to anon, authenticated;
