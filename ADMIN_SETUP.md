# Admin access setup

Showmelove administrators use the same normal sign-up and sign-in page as every other user. There is no master password, hard-coded email, or browser-stored admin list.

## One-time database setup

In the Supabase dashboard, open **SQL Editor** and run:

```sql
-- Paste and run the contents of:
-- supabase/migrations/20261127_secure_roles_and_gifts.sql
```

This creates `public.user_roles`. Only a server or the Supabase dashboard can change it.

## Grant an existing account admin access

The person must first create and verify a normal Showmelove account. Then run this in the Supabase SQL Editor, replacing the email:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin'
from auth.users
where lower(email) = lower('person@example.com')
on conflict (user_id)
do update set role = excluded.role, updated_at = now();
```

Use `'super_admin'` only for the platform owner.

## Revoke access

```sql
delete from public.user_roles
where user_id = (select id from auth.users where lower(email) = lower('person@example.com'));
```

After a role is granted or revoked, the person should sign out and sign back in. The app checks the database role when the normal session starts.
