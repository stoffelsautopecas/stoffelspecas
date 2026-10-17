begin;
drop trigger if exists users_seller_guard on stoffels.users;
drop trigger if exists orders_seller_guard on stoffels.orders;
update stoffels.users set seller_slug='rennan' where seller_slug='vitor';
update stoffels.orders set seller_slug='rennan' where seller_slug='vitor';
create or replace function stoffels.enforce_seller() returns trigger language plpgsql as $$
begin
 if new.seller_slug is null or new.seller_slug not in ('thiago','rennan','both') then raise exception 'Atendimento inválido'; end if;
 if TG_OP='UPDATE' and old.seller_slug is distinct from new.seller_slug then raise exception 'Não é permitido transferir o atendimento'; end if;
 if TG_TABLE_NAME='orders' then
  if not exists(select 1 from stoffels.users u where u.id=new.user_id and u.seller_slug=new.seller_slug) then raise exception 'Pedido e cliente devem pertencer ao mesmo atendimento'; end if;
 end if;
 return new;
end $$;
create trigger users_seller_guard before insert or update on stoffels.users for each row execute function stoffels.enforce_seller();
create trigger orders_seller_guard before insert or update on stoffels.orders for each row execute function stoffels.enforce_seller();
commit;
