begin;
alter table stoffels.users add column if not exists seller_slug text;
alter table stoffels.orders add column if not exists seller_slug text;
alter table stoffels.users drop constraint if exists users_email_key;
create unique index if not exists admin_email_unique on stoffels.users(email) where role='admin';
create unique index if not exists customer_seller_email_unique on stoffels.users(email,seller_slug) where role='customer';
create index if not exists orders_seller_created on stoffels.orders(seller_slug,created_at desc);
create index if not exists users_seller on stoffels.users(seller_slug);
-- O vínculo é obrigatório e imutável; uma troca de link nunca transfere dados.
create or replace function stoffels.enforce_seller() returns trigger language plpgsql as $$
begin
 if new.seller_slug is null or new.seller_slug not in ('thiago','vitor') then raise exception 'Atendimento inválido'; end if;
 if TG_OP='UPDATE' and old.seller_slug is distinct from new.seller_slug then raise exception 'Não é permitido transferir o atendimento'; end if;
 if TG_TABLE_NAME='orders' then
  if not exists(select 1 from stoffels.users u where u.id=new.user_id and u.seller_slug=new.seller_slug) then raise exception 'Pedido e cliente devem pertencer ao mesmo atendimento'; end if;
 end if;
 return new;
end $$;
drop trigger if exists users_seller_guard on stoffels.users;
create trigger users_seller_guard before insert or update on stoffels.users for each row execute function stoffels.enforce_seller();
drop trigger if exists orders_seller_guard on stoffels.orders;
create trigger orders_seller_guard before insert or update on stoffels.orders for each row execute function stoffels.enforce_seller();
commit;
