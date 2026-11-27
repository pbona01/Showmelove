-- Run this migration in Supabase SQL Editor before enabling admin or payout features.
-- Admin roles live in Postgres, never in frontend code or browser storage.

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'admin', 'super_admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;

drop policy if exists "users can read own role" on public.user_roles;
create policy "users can read own role"
  on public.user_roles for select
  using (auth.uid() = user_id);

-- Do not create client-side insert/update/delete policies. Manage roles only in
-- Supabase Dashboard SQL Editor or a future server endpoint that verifies a super_admin.

-- After a person creates a normal account, assign them deliberately:
-- insert into public.user_roles (user_id, role)
-- select id, 'admin' from auth.users where email = 'person@example.com'
-- on conflict (user_id) do update set role = excluded.role, updated_at = now();

-- Remove the insecure public gift policies installed by the previous migration.
drop policy if exists "allow read gifts" on public.gifts;
drop policy if exists "allow insert gifts" on public.gifts;
drop policy if exists "allow update gifts" on public.gifts;

-- Authenticated recipients can access their own inbox; gift-link access should
-- be served through a dedicated tokenized endpoint, not a public table policy.
create policy "recipients read own gifts"
  on public.gifts for select to authenticated
  using (lower(recipient_email) = lower(auth.jwt() ->> 'email'));

create policy "senders read own gifts"
  on public.gifts for select to authenticated
  using (lower(sender_email) = lower(auth.jwt() ->> 'email'));
