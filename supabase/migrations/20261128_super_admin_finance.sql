-- Showmelove Super Admin finance foundation
-- Apply this migration in the Supabase SQL Editor before enabling the new
-- master-wallet reporting or any master-wallet withdrawals.
-- It never deletes or rewrites historical financial records.

create extension if not exists pgcrypto;

-- User money is split explicitly: spendable gifting coins, withdrawable gift
-- earnings, and reserved gift earnings for pending user withdrawals.
alter table public.wallets
  add column if not exists withdrawable_gift_coins_balance bigint not null default 0
    check (withdrawable_gift_coins_balance >= 0),
  add column if not exists reserved_withdrawable_gift_coins_balance bigint not null default 0
    check (reserved_withdrawable_gift_coins_balance >= 0);

-- Payment gateway cost is recorded separately from platform income. Existing
-- records remain at zero because their historical Paystack fee is unavailable.
alter table public.payment_events
  add column if not exists gateway_fee_naira bigint not null default 0
    check (gateway_fee_naira >= 0);

-- A fee ledger is the source of truth for company money. User wallets are never
-- used to calculate or store company profit.
alter table public.platform_fee_transactions
  add column if not exists category text,
  add column if not exists gross_fee_coins bigint,
  add column if not exists gateway_fee_naira bigint not null default 0
    check (gateway_fee_naira >= 0),
  add column if not exists net_profit_naira bigint;

update public.platform_fee_transactions
set category = coalesce(category, source),
    gross_fee_coins = coalesce(gross_fee_coins, coins),
    net_profit_naira = coalesce(net_profit_naira, coins - gateway_fee_naira)
where category is null or gross_fee_coins is null or net_profit_naira is null;

alter table public.platform_fee_transactions
  alter column category set not null,
  alter column gross_fee_coins set not null,
  alter column net_profit_naira set not null;

alter table public.platform_fee_transactions
  drop constraint if exists platform_fee_transactions_category_check;
alter table public.platform_fee_transactions
  add constraint platform_fee_transactions_category_check
  check (category in ('coin_funding', 'spray', 'guest_gift', 'account_gift', 'withdrawal_fee', 'other'));

-- The only way company money leaves the master wallet is an auditable request.
create table if not exists public.master_wallet_withdrawals (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete restrict,
  amount_naira bigint not null check (amount_naira > 0),
  destination jsonb not null,
  status text not null default 'verification_pending'
    check (status in ('verification_pending', 'approved', 'processing', 'paid', 'rejected', 'cancelled', 'failed')),
  reference text unique,
  verification_code_hash text,
  verification_expires_at timestamptz,
  verified_at timestamptz,
  approved_at timestamptz,
  paid_at timestamptz,
  provider_transfer_reference text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One designated super-admin is allowed to initiate and verify master-wallet
-- withdrawals. All other admins remain read-only for these actions.
create table if not exists public.master_wallet_settings (
  singleton boolean primary key default true check (singleton),
  authorized_super_admin_id uuid references auth.users(id) on delete restrict,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.master_wallet_settings(singleton)
values (true)
on conflict (singleton) do nothing;

-- Audit history is append-only at application level. Do not delete rows.
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists master_wallet_withdrawals_status_created_idx
  on public.master_wallet_withdrawals(status, created_at desc);
create index if not exists admin_audit_logs_actor_created_idx
  on public.admin_audit_logs(actor_id, created_at desc);
create index if not exists platform_fee_transactions_category_created_idx
  on public.platform_fee_transactions(category, created_at desc);

alter table public.master_wallet_withdrawals enable row level security;
alter table public.master_wallet_settings enable row level security;
alter table public.admin_audit_logs enable row level security;
-- No browser policies are created. These company-finance tables are accessible
-- only through server-side endpoints using the Supabase service-role key.

-- Funding policy: 7% Showmelove gross fee. The gateway's actual fee is passed
-- from Paystack's verified transaction response and kept separate.
drop function if exists public.settle_paystack_funding(text, uuid, bigint);
create function public.settle_paystack_funding(
  p_reference text,
  p_user_id uuid,
  p_amount_naira bigint,
  p_gateway_fee_naira bigint default 0
) returns jsonb
language plpgsql
security definer
set search_path = public
as $finance$
declare
  v_credit bigint;
  v_platform_fee bigint;
  v_existing public.payment_events%rowtype;
begin
  if p_amount_naira < 100 or p_amount_naira > 500000 then
    raise exception 'Funding amount outside allowed range';
  end if;
  if p_gateway_fee_naira < 0 or p_gateway_fee_naira > p_amount_naira then
    raise exception 'Invalid payment gateway fee';
  end if;

  select * into v_existing from public.payment_events where reference = p_reference for update;
  if found and v_existing.status = 'succeeded' then
    return jsonb_build_object('status', 'succeeded', 'credited_coins', v_existing.credited_coins, 'idempotent', true);
  end if;

  v_platform_fee := floor(p_amount_naira * 0.07);
  v_credit := p_amount_naira - v_platform_fee;

  insert into public.payment_events(reference, user_id, amount_naira, credited_coins, fee_coins, gateway_fee_naira, status, settled_at)
  values (p_reference, p_user_id, p_amount_naira, v_credit, v_platform_fee, p_gateway_fee_naira, 'succeeded', now())
  on conflict (reference) do update set
    user_id = excluded.user_id,
    amount_naira = excluded.amount_naira,
    credited_coins = excluded.credited_coins,
    fee_coins = excluded.fee_coins,
    gateway_fee_naira = excluded.gateway_fee_naira,
    status = 'succeeded',
    settled_at = now();

  insert into public.wallets(user_id, love_coins_balance, updated_at)
  values (p_user_id, v_credit, now())
  on conflict (user_id) do update
    set love_coins_balance = public.wallets.love_coins_balance + v_credit,
        updated_at = now();

  insert into public.wallet_transactions(user_id, kind, coins_delta, reference)
  values (p_user_id, 'paystack_funding', v_credit, p_reference)
  on conflict (reference) do nothing;

  insert into public.platform_fee_transactions(
    source, category, reference, coins, gross_fee_coins, gateway_fee_naira, net_profit_naira
  )
  values (
    'wallet_funding', 'coin_funding', p_reference, v_platform_fee, v_platform_fee,
    p_gateway_fee_naira, greatest(0, v_platform_fee - p_gateway_fee_naira)
  )
  on conflict (reference) do nothing;

  return jsonb_build_object(
    'status', 'succeeded',
    'credited_coins', v_credit,
    'platform_fee_coins', v_platform_fee,
    'gateway_fee_naira', p_gateway_fee_naira,
    'idempotent', false
  );
end;
$finance$;

revoke all on function public.settle_paystack_funding(text, uuid, bigint, bigint) from public, anon, authenticated;
grant execute on function public.settle_paystack_funding(text, uuid, bigint, bigint) to service_role;
