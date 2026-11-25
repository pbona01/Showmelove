-- Showmelove Promise Cards Table
-- Allows users to publish their personalized wishlist of items to promise/sponsor.

create table if not exists public.promise_cards (
  username text primary key,
  title text not null,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.promise_cards enable row level security;

-- Public read for anyone opening a shared Promise Card link
drop policy if exists "allow read promise cards" on public.promise_cards;
create policy "allow read promise cards" on public.promise_cards for select using (true);

-- Allow inserting or updating promise cards
drop policy if exists "allow insert promise cards" on public.promise_cards;
create policy "allow insert promise cards" on public.promise_cards for insert with check (true);

drop policy if exists "allow update promise cards" on public.promise_cards;
create policy "allow update promise cards" on public.promise_cards for update using (true);
