import { AuthError,authPool } from './auth.js';
import { postalCode } from './shipping.js';
export const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
export function text(value,min,max,label){const v=typeof value==='string'?value.trim():'';if(v.length<min||v.length>max)throw new AuthError(`Confira o campo ${label}.`);return v;}
export function phone(value){let v=String(value||'').replace(/\D/g,'');if(v.length===13&&v.startsWith('55'))v=v.slice(2);if(!/^\d{10,11}$/.test(v))throw new AuthError('Informe um telefone válido com DDD.');return v;}
export function address(value){
 const v=value||{};const state=text(v.state,2,2,'estado').toUpperCase();
 if(!new Set('AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')).has(state))throw new AuthError('Selecione um estado válido.');
 return {receiver:text(v.receiver,2,100,'destinatário'),cep:postalCode(v.cep),street:text(v.street,2,150,'rua'),number:text(v.number,1,20,'número'),neighborhood:text(v.neighborhood,2,100,'bairro'),city:text(v.city,2,100,'cidade'),state,complement:text(v.complement,0,150,'complemento')};
}
export async function transaction(work,pool=authPool()){
 const client=await pool.connect();try{await client.query('begin');const result=await work(client);await client.query('commit');return result;}catch(error){await client.query('rollback');throw error;}finally{client.release();}
}
export async function syncStock(client,ids){
 await client.query(`update stoffels.products set available=(published and not archived and stock_quantity>0),catalog=jsonb_set(catalog,'{available}',to_jsonb(published and not archived and stock_quantity>0)),details=jsonb_set(details,'{available}',to_jsonb(published and not archived and stock_quantity>0)),updated_at=now() where id=any($1)`,[ids]);
}
export async function releaseStock(client,order){
 if(!order.stock_reserved)return;
 const {rows}=await client.query('select product_id,quantity from stoffels.order_items where order_id=$1 order by product_id',[order.id]);
 for(const item of rows)await client.query('update stoffels.products set stock_quantity=stock_quantity+$1 where id=$2',[item.quantity,item.product_id]);
 await syncStock(client,rows.map(x=>x.product_id));await client.query('update stoffels.orders set stock_reserved=false where id=$1',[order.id]);
}
export async function orderView(client,order,admin=false){
 const {rows:items}=await client.query('select product_id as "productId",name,quantity,unit_price_cents::float8 as "unitPriceCents" from stoffels.order_items where order_id=$1 order by product_id',[order.id]);
 const {rows:messages}=await client.query('select m.id,m.body,m.created_at,u.name,u.role from stoffels.order_messages m join stoffels.users u on u.id=m.user_id where m.order_id=$1 order by m.created_at',[order.id]);
 const result={id:order.id,status:order.status,checkoutState:order.checkout_state,subtotalCents:Number(order.subtotal_cents),shippingCents:Number(order.shipping_cents),totalCents:Number(order.total_cents),shipping:order.shipping_details,address:order.address,customerName:order.customer_name,customerEmail:order.customer_email,customerPhone:order.customer_phone,checkoutUrl:order.status==='checkout_created'?order.checkout_url:null,createdAt:order.created_at,paidAt:order.paid_at,fulfillmentStatus:order.fulfillment_status,trackingCode:order.tracking_code,trackingUrl:order.tracking_url,paymentReview:order.payment_review,items,messages};
 if(admin)Object.assign(result,{adminNote:order.admin_note,invoiceSlug:order.invoice_slug,transactionNsu:order.transaction_nsu,stockReserved:order.stock_reserved});return result;
}
