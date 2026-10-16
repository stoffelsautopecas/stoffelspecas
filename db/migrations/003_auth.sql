begin;
create table if not exists stoffels.users (
 id uuid primary key default gen_random_uuid(), name text not null,
 email text not null unique check(email=lower(email)), password_hash text not null,
 role text not null default 'customer' check(role in ('customer','admin')),
 created_at timestamptz not null default now()
);
create table if not exists stoffels.sessions (
 token_hash text primary key, user_id uuid not null references stoffels.users(id) on delete cascade,
 expires_at timestamptz not null, created_at timestamptz not null default now()
);
create index if not exists sessions_user_id on stoffels.sessions(user_id);
create table if not exists stoffels.auth_limits (
 key text primary key, attempts integer not null, window_start timestamptz not null default now()
);
alter table stoffels.users enable row level security;
alter table stoffels.sessions enable row level security;
alter table stoffels.auth_limits enable row level security;
revoke all on stoffels.users, stoffels.sessions, stoffels.auth_limits from public, anon, authenticated;
commit;
