import { pgSchema, integer, bigint, text, boolean, jsonb, timestamp, uuid, primaryKey } from 'drizzle-orm/pg-core';

export const store = pgSchema('stoffels');
export const categories = store.table('categories', {
  slug: text('slug').primaryKey(), name: text('name').notNull(), count: integer('product_count').notNull(),
});
export const products = store.table('products', {
  id: integer('id').primaryKey(), slug: text('slug').notNull().unique(), name: text('name').notNull(),
  priceCents: bigint('price_cents',{mode:'number'}).notNull(), originalPriceCents: bigint('original_price_cents',{mode:'number'}).notNull(),
  brand: text('brand').notNull(), model: text('model').notNull(), available: boolean('available').notNull(),
  categorySlug: text('category_slug').notNull().references(()=>categories.slug),
  stockQuantity: integer('stock_quantity'), shipping:jsonb('shipping'), archived:boolean('archived').notNull().default(false), published:boolean('published').notNull().default(true),
  catalog: jsonb('catalog').notNull(), details: jsonb('details').notNull(),
  updatedAt: timestamp('updated_at',{withTimezone:true}).defaultNow().notNull(),
});
export const productImages = store.table('product_images', {
  productId: integer('product_id').notNull().references(()=>products.id),
  path: text('path').notNull(), position: integer('position').notNull(),
}, t=>[primaryKey({columns:[t.productId,t.path]})]);
export const orders = store.table('orders', {
  id: uuid('id').primaryKey().defaultRandom(), accessTokenHash: text('access_token_hash').notNull(),
  status: text('status').notNull().default('pending'), currency: text('currency').notNull().default('BRL'),
  subtotalCents: bigint('subtotal_cents',{mode:'number'}).notNull(), shippingCents: bigint('shipping_cents',{mode:'number'}).notNull(),
  totalCents: bigint('total_cents',{mode:'number'}).notNull(), shippingMethod: text('shipping_method'),
  customerName: text('customer_name'), customerEmail: text('customer_email'), address: jsonb('address'),
  checkoutUrl: text('checkout_url'), transactionNsu: text('transaction_nsu').unique(),
  createdAt: timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
  paidAt: timestamp('paid_at',{withTimezone:true}),userId:uuid('user_id'),clientKey:uuid('client_key'),requestHash:text('request_hash'),invoiceSlug:text('invoice_slug'),checkoutState:text('checkout_state').notNull().default('preparing'),stockReserved:boolean('stock_reserved').notNull().default(false),shippingQuoteId:uuid('shipping_quote_id'),shippingDetails:jsonb('shipping_details'),customerPhone:text('customer_phone'),fulfillmentStatus:text('fulfillment_status').notNull().default('awaiting_payment'),trackingCode:text('tracking_code'),trackingUrl:text('tracking_url'),adminNote:text('admin_note'),paymentReview:boolean('payment_review').notNull().default(false),updatedAt:timestamp('updated_at',{withTimezone:true}).defaultNow().notNull(),
});
export const orderItems = store.table('order_items', {
  orderId: uuid('order_id').notNull().references(()=>orders.id), productId: integer('product_id').notNull().references(()=>products.id),
  quantity: integer('quantity').notNull(), unitPriceCents: bigint('unit_price_cents',{mode:'number'}).notNull(), name: text('name').notNull(),
}, t=>[primaryKey({columns:[t.orderId,t.productId]})]);
export const paymentEvents = store.table('payment_events', {
  id: uuid('id').primaryKey().defaultRandom(), orderId: uuid('order_id').notNull().references(()=>orders.id),
  transactionNsu: text('transaction_nsu').notNull().unique(), captureMethod: text('capture_method').notNull(),
  amountCents: bigint('amount_cents',{mode:'number'}).notNull(), verified: boolean('verified').notNull().default(false),
  payload: jsonb('payload').notNull(), receivedAt: timestamp('received_at',{withTimezone:true}).defaultNow().notNull(),
});
export const users = store.table('users', {
  id: uuid('id').primaryKey().defaultRandom(), name:text('name').notNull(), email:text('email').notNull().unique(),
  passwordHash:text('password_hash').notNull(), role:text('role').notNull().default('customer'),
  phone:text('phone'),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
});
export const sessions = store.table('sessions', {
  tokenHash:text('token_hash').primaryKey(),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),
  expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
});
export const authLimits = store.table('auth_limits', {
  key:text('key').primaryKey(),attempts:integer('attempts').notNull(),windowStart:timestamp('window_start',{withTimezone:true}).defaultNow().notNull(),
});

export const shippingQuotes=store.table('shipping_quotes',{
 id:uuid('id').primaryKey().defaultRandom(),cartHash:text('cart_hash').notNull(),postalCode:text('postal_code').notNull(),options:jsonb('options').notNull(),
 expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull(),
});

export const addresses=store.table('addresses',{id:uuid('id').primaryKey().defaultRandom(),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),label:text('label').notNull(),address:jsonb('address').notNull(),updatedAt:timestamp('updated_at',{withTimezone:true}).defaultNow().notNull()});
export const orderMessages=store.table('order_messages',{id:uuid('id').primaryKey().defaultRandom(),orderId:uuid('order_id').notNull().references(()=>orders.id),userId:uuid('user_id').notNull().references(()=>users.id),body:text('body').notNull(),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull()});
export const productUploads=store.table('product_uploads',{id:uuid('id').primaryKey().defaultRandom(),mime:text('mime').notNull().default('image/webp'),createdBy:uuid('created_by').notNull().references(()=>users.id),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull()});
export const settings=store.table('settings',{key:text('key').primaryKey(),value:jsonb('value').notNull()});
export const accountTokens=store.table('account_tokens',{tokenHash:text('token_hash').primaryKey(),userId:uuid('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),expiresAt:timestamp('expires_at',{withTimezone:true}).notNull(),createdAt:timestamp('created_at',{withTimezone:true}).defaultNow().notNull()});
