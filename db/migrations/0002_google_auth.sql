-- Google sign-in. The users table stays authoritative: we do not adopt an auth
-- library's schema, because events, payments and retention all hang off users.id.

alter table users add column if not exists google_sub  text unique;
alter table users add column if not exists name        text;
alter table users add column if not exists avatar_url  text;
alter table users add column if not exists last_seen_at timestamptz;

create index if not exists users_google_sub_idx on users(google_sub);

-- An event now records who was signed in when it was created. Nullable because
-- v1 lets a family build a brief before signing in; the row is claimed at the
-- gate. See docs/auth.md.
alter table events add column if not exists claimed_at timestamptz;
