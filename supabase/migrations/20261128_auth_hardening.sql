-- Authentication hardening: unique usernames, no duplicate account details.
-- Supabase already enforces unique email addresses in auth.users. This adds the
-- same database-level guarantee for Showmelove usernames.

create extension if not exists citext;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username citext not null unique,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username::text ~ '^[a-z0-9_]{3,20}$')
);

alter table public.profiles enable row level security;

-- A signed-in user may only read their own private profile record. There is no
-- public email or username directory.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
on public.profiles for select
using (auth.uid() = id);

create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $profile_sync$
declare
  v_username text;
  v_display_name text;
begin
  v_username := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  v_display_name := trim(coalesce(
    new.raw_user_meta_data ->> 'display_name',
    new.raw_user_meta_data ->> 'full_name',
    ''
  ));

  if v_username !~ '^[a-z0-9_]{3,20}$' then
    raise exception 'Username must use 3-20 lowercase letters, numbers, or underscores.';
  end if;

  insert into public.profiles(id, username, display_name, updated_at)
  values (new.id, v_username, v_display_name, now())
  on conflict (id) do update
    set username = excluded.username,
        display_name = excluded.display_name,
        updated_at = now();

  return new;
end;
$profile_sync$;

drop trigger if exists on_auth_user_profile_sync on auth.users;
create trigger on_auth_user_profile_sync
after insert or update of raw_user_meta_data on auth.users
for each row execute function public.sync_profile_from_auth();

-- Backfill verified existing accounts. If any historical usernames clash, the
-- affected account is assigned a stable account-id-based handle instead of
-- failing the migration.
insert into public.profiles(id, username, display_name, created_at, updated_at)
select
  u.id,
  case
    when lower(trim(coalesce(u.raw_user_meta_data ->> 'username', ''))) ~ '^[a-z0-9_]{3,20}$'
      then lower(trim(u.raw_user_meta_data ->> 'username', '')) || '_' || left(replace(u.id::text, '-', ''), 6)
    else 'member_' || left(replace(u.id::text, '-', ''), 10)
  end,
  trim(coalesce(u.raw_user_meta_data ->> 'display_name', u.raw_user_meta_data ->> 'full_name', '')),
  coalesce(u.created_at, now()),
  now()
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Keep an existing canonical username only when exactly one account claims it.
-- Duplicated historical usernames keep their generated safe handle and can be
-- changed later by the affected member.
with candidates as (
  select
    u.id,
    lower(trim(u.raw_user_meta_data ->> 'username'))::citext as username,
    count(*) over (
      partition by lower(trim(u.raw_user_meta_data ->> 'username'))
    ) as username_count
  from auth.users u
  where lower(trim(coalesce(u.raw_user_meta_data ->> 'username', ''))) ~ '^[a-z0-9_]{3,20}$'
)
update public.profiles p
set username = candidate.username,
    updated_at = now()
from candidates candidate
where p.id = candidate.id
  and candidate.username_count = 1;

-- Do not grant anonymous or authenticated write access. Only the protected
-- auth trigger writes this table.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
