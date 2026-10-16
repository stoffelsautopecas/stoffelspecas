begin;
create schema if not exists stoffels;
revoke all on schema stoffels from public, anon, authenticated;
create table if not exists stoffels.categories (
  slug text primary key, name text not null, product_count integer not null check (product_count>=0)
);
create table if not exists stoffels.products (
  id integer primary key, slug text unique not null, name text not null,
  price_cents bigint not null check(price_cents>=0), original_price_cents bigint not null check(original_price_cents>=0),
  brand text not null, model text not null, available boolean not null,
  category_slug text not null references stoffels.categories(slug), stock_quantity integer check(stock_quantity>=0),
  catalog jsonb not null, details jsonb not null, updated_at timestamptz not null default now()
);
create index if not exists products_category_idx on stoffels.products(category_slug);
create table if not exists stoffels.product_images (
  product_id integer not null references stoffels.products(id), path text not null,
  position integer not null check(position>=0), primary key(product_id,path)
);
create table if not exists stoffels.orders (
  id uuid primary key default gen_random_uuid(), access_token_hash text not null,
  status text not null default 'pending' check(status in ('pending','checkout_created','paid','cancelled','failed')),
  currency text not null default 'BRL' check(currency='BRL'),
  subtotal_cents bigint not null check(subtotal_cents>=0), shipping_cents bigint not null check(shipping_cents>=0),
  total_cents bigint not null check(total_cents=subtotal_cents+shipping_cents), shipping_method text,
  customer_name text, customer_email text, address jsonb, checkout_url text,
  transaction_nsu text unique, created_at timestamptz not null default now(), paid_at timestamptz
);
create table if not exists stoffels.order_items (
  order_id uuid not null references stoffels.orders(id), product_id integer not null references stoffels.products(id),
  quantity integer not null check(quantity>0), unit_price_cents bigint not null check(unit_price_cents>=0),
  name text not null, primary key(order_id,product_id)
);
create table if not exists stoffels.payment_events (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references stoffels.orders(id),
  transaction_nsu text unique not null, capture_method text not null check(capture_method in ('pix','credit_card')),
  amount_cents bigint not null check(amount_cents>=0), verified boolean not null default false,
  payload jsonb not null, received_at timestamptz not null default now()
);
alter table stoffels.categories enable row level security;
alter table stoffels.products enable row level security;
alter table stoffels.product_images enable row level security;
alter table stoffels.orders enable row level security;
alter table stoffels.order_items enable row level security;
alter table stoffels.payment_events enable row level security;
revoke all on all tables in schema stoffels from public, anon, authenticated;
commit;
