-- Showmelove Cross-Device Gifting & Storage Schema
-- Run in Supabase SQL editor to ensure public.gifts supports cross-device gifting.

create table if not exists public.gifts (
  id text primary key,
  checkout_attempt_id text,
  created_at timestamptz not null default now(),
  sender_name text not null,
  sender_email text,
  recipient_name text not null,
  recipient_email text,
  promise_text text not null,
  promise_card_style text,
  message_text text,
  emote text,
  amount_naira bigint not null default 1000,
  coins_spent bigint not null default 1000,
  platform_fee_naira bigint not null default 70,
  recipient_earnings_naira bigint not null default 930,
  has_voice_note boolean not null default false,
  voice_note_source text default 'none',
  voice_note_duration_sec integer,
  snapshot jsonb,
  claimed_at timestamptz,
  claimed_by_email text
);

create index if not exists idx_gifts_recipient_email on public.gifts (lower(recipient_email));
create index if not exists idx_gifts_recipient_name on public.gifts (lower(recipient_name));
create index if not exists idx_gifts_created_at on public.gifts (created_at desc);

alter table public.gifts enable row level security;

-- Allow public read access so recipients and viewers can open gifts via their links or in inbox
drop policy if exists "allow read gifts" on public.gifts;
create policy "allow read gifts" on public.gifts for select using (true);

-- Allow inserting gifts from checkout
drop policy if exists "allow insert gifts" on public.gifts;
create policy "allow insert gifts" on public.gifts for insert with check (true);

-- Allow updating gifts (e.g. claiming or revealing)
drop policy if exists "allow update gifts" on public.gifts;
create policy "allow update gifts" on public.gifts for update using (true);
