begin;
alter table stoffels.products add column if not exists shipping jsonb;
create table if not exists stoffels.shipping_quotes (
 id uuid primary key default gen_random_uuid(), cart_hash text not null, postal_code text not null,
 options jsonb not null, expires_at timestamptz not null default now()+interval '15 minutes',
 created_at timestamptz not null default now()
);
alter table stoffels.shipping_quotes enable row level security;
revoke all on stoffels.shipping_quotes from public, anon, authenticated;
create index if not exists shipping_quotes_expiry on stoffels.shipping_quotes(expires_at);
commit;
