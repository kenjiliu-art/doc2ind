
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  paddle_transaction_id text not null unique,
  paddle_customer_id text,
  price_id text not null,
  product_id text not null,
  kind text not null check (kind in ('day_pass','lifetime')),
  expires_at timestamptz,
  environment text not null default 'sandbox',
  created_at timestamptz not null default now()
);
create index idx_purchases_user on public.purchases(user_id);
grant select on public.purchases to authenticated;
grant all on public.purchases to service_role;
alter table public.purchases enable row level security;
create policy "Users view own purchases" on public.purchases for select to authenticated using (auth.uid() = user_id);
create policy "Service role manages purchases" on public.purchases for all using (auth.role() = 'service_role');

create or replace function public.has_paid_access(user_uuid uuid, check_env text default 'live')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.purchases
    where user_id = user_uuid
      and environment = check_env
      and (kind = 'lifetime' or (expires_at is not null and expires_at > now()))
  );
$$;
