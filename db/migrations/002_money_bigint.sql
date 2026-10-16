begin;
alter table stoffels.products alter column price_cents type bigint, alter column original_price_cents type bigint;
alter table stoffels.orders alter column subtotal_cents type bigint, alter column shipping_cents type bigint, alter column total_cents type bigint;
alter table stoffels.order_items alter column unit_price_cents type bigint;
alter table stoffels.payment_events alter column amount_cents type bigint;
commit;
