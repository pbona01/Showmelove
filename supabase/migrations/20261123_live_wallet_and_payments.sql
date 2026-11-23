-- Showmelove live wallet: apply in Supabase SQL Editor before enabling Paystack live mode.
-- Money is never credited from the browser; only the verified Paystack webhook invokes
-- settle_paystack_funding using the Supabase server secret.

create extension if not exists pgcrypto;

create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  love_coins_balance bigint not null default 0 check (love_coins_balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  reference text primary key,
  user_id uuid not null references auth.users(id) on delete restrict,
  amount_naira bigint not null check (amount_naira > 0),
  credited_coins bigint not null default 0,
  fee_coins bigint not null default 0,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  kind text not null,
  coins_delta bigint not null,
  reference text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_fee_transactions (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  reference text unique not null,
  coins bigint not null check (coins >= 0),
  created_at timestamptz not null default now()
);

alter table public.wallets enable row level security;
alter table public.payment_events enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.platform_fee_transactions enable row level security;

drop policy if exists "read own wallet" on public.wallets;
create policy "read own wallet" on public.wallets for select using (auth.uid() = user_id);
drop policy if exists "read own payment events" on public.payment_events;
create policy "read own payment events" on public.payment_events for select using (auth.uid() = user_id);
drop policy if exists "read own wallet transactions" on public.wallet_transactions;
create policy "read own wallet transactions" on public.wallet_transactions for select using (auth.uid() = user_id);

create or replace function public.settle_paystack_funding(
  p_reference text,
  p_user_id uuid,
  p_amount_naira bigint
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_credit bigint;
  v_fee bigint;
  v_existing public.payment_events%rowtype;
begin
  if p_amount_naira < 100 or p_amount_naira > 500000 then
    raise exception 'Funding amount outside allowed range';
  end if;

  select * into v_existing from public.payment_events where reference = p_reference for update;
  if found and v_existing.status = 'succeeded' then
    return jsonb_build_object('status', 'succeeded', 'credited_coins', v_existing.credited_coins, 'idempotent', true);
  end if;

  -- 3% funding settlement: ₦10,000 credits 9,700 Love Coins.
  v_credit := floor(p_amount_naira * 0.97);
  v_fee := p_amount_naira - v_credit;

  insert into public.payment_events(reference, user_id, amount_naira, credited_coins, fee_coins, status, settled_at)
  values (p_reference, p_user_id, p_amount_naira, v_credit, v_fee, 'succeeded', now())
  on conflict (reference) do update set
    user_id = excluded.user_id, amount_naira = excluded.amount_naira,
    credited_coins = excluded.credited_coins, fee_coins = excluded.fee_coins,
    status = 'succeeded', settled_at = now();

  insert into public.wallets(user_id, love_coins_balance, updated_at)
  values (p_user_id, v_credit, now())
  on conflict (user_id) do update set love_coins_balance = public.wallets.love_coins_balance + v_credit, updated_at = now();

  insert into public.wallet_transactions(user_id, kind, coins_delta, reference)
  values (p_user_id, 'paystack_funding', v_credit, p_reference)
  on conflict (reference) do nothing;

  insert into public.platform_fee_transactions(source, reference, coins)
  values ('wallet_funding', p_reference, v_fee)
  on conflict (reference) do nothing;

  return jsonb_build_object('status', 'succeeded', 'credited_coins', v_credit, 'idempotent', false);
end;
$$;

revoke all on function public.settle_paystack_funding(text, uuid, bigint) from public, anon, authenticated;
grant execute on function public.settle_paystack_funding(text, uuid, bigint) to service_role;

