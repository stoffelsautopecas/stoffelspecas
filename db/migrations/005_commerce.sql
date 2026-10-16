begin;
alter table stoffels.products add column if not exists archived boolean not null default false;
alter table stoffels.products add column if not exists published boolean;
update stoffels.products set published=available where published is null;
alter table stoffels.products alter column published set default true;
alter table stoffels.products alter column published set not null;
create sequence if not exists stoffels.product_id_seq;
select setval('stoffels.product_id_seq',greatest(coalesce((select max(id) from stoffels.products),1),(select last_value from stoffels.product_id_seq)));
alter table stoffels.products alter column id set default nextval('stoffels.product_id_seq');
alter table stoffels.users add column if not exists phone text;
create table if not exists stoffels.addresses (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references stoffels.users(id) on delete cascade,
 label text not null default 'Entrega', address jsonb not null,updated_at timestamptz not null default now()
);
alter table stoffels.orders add column if not exists user_id uuid references stoffels.users(id);
alter table stoffels.orders add column if not exists client_key uuid;
alter table stoffels.orders add column if not exists request_hash text;
alter table stoffels.orders add column if not exists invoice_slug text;
alter table stoffels.orders add column if not exists checkout_state text not null default 'preparing';
alter table stoffels.orders add column if not exists stock_reserved boolean not null default false;
alter table stoffels.orders add column if not exists shipping_quote_id uuid references stoffels.shipping_quotes(id) on delete set null;
alter table stoffels.orders add column if not exists shipping_details jsonb;
alter table stoffels.orders add column if not exists customer_phone text;
alter table stoffels.orders add column if not exists fulfillment_status text not null default 'awaiting_payment';
alter table stoffels.orders add column if not exists tracking_code text;
alter table stoffels.orders add column if not exists tracking_url text;
alter table stoffels.orders add column if not exists admin_note text;
alter table stoffels.orders add column if not exists payment_review boolean not null default false;
alter table stoffels.orders add column if not exists updated_at timestamptz not null default now();
create unique index if not exists orders_customer_key on stoffels.orders(user_id,client_key);
create index if not exists orders_user_created on stoffels.orders(user_id,created_at desc);
create table if not exists stoffels.order_messages (
 id uuid primary key default gen_random_uuid(),order_id uuid not null references stoffels.orders(id),
 user_id uuid not null references stoffels.users(id),body text not null,created_at timestamptz not null default now()
);
create table if not exists stoffels.product_uploads (
 id uuid primary key default gen_random_uuid(),content bytea not null,mime text not null default 'image/webp',
 created_by uuid not null references stoffels.users(id),created_at timestamptz not null default now()
);
create table if not exists stoffels.settings (key text primary key,value jsonb not null);
insert into stoffels.settings(key,value) values('store','{"name":"Stoffels Autopeças","legalName":"","cnpj":"","email":"","phone":"","address":"Rua Comandai, 1287 - Centro, Guarani das Missões/RS, CEP 97950-000","dispatchDays":2}') on conflict do nothing;
create table if not exists stoffels.account_tokens (
 token_hash text primary key,user_id uuid not null references stoffels.users(id) on delete cascade,
 expires_at timestamptz not null,created_at timestamptz not null default now()
);
alter table stoffels.addresses enable row level security;
alter table stoffels.order_messages enable row level security;
alter table stoffels.product_uploads enable row level security;
alter table stoffels.settings enable row level security;
alter table stoffels.account_tokens enable row level security;
revoke all on all tables in schema stoffels from public,anon,authenticated;
revoke all on all sequences in schema stoffels from public,anon,authenticated;
commit;
