import {sellers} from './sellers.js';
import { randomBytes,createHmac,timingSafeEqual } from 'node:crypto';
import { AuthError,authPool,digest } from './auth.js';
import { uuid,phone,address,transaction,syncStock,releaseStock } from './commerce.js';
import { shippingCart,selectedShipping } from './shipping.js';
import { priceCart,checkoutPayload,createInfinitePayClient,validPaymentResult } from './infinitepay.js';
export function webhookToken(id){if(!process.env.CHECKOUT_WEBHOOK_SECRET)throw new AuthError('Pagamento temporariamente indisponível.',503);return createHmac('sha256',process.env.CHECKOUT_WEBHOOK_SECRET).update(id).digest('hex');}
export function validWebhookToken(id,value){if(!uuid(id)||!/^[a-f0-9]{64}$/.test(value||''))return false;return timingSafeEqual(Buffer.from(webhookToken(id)),Buffer.from(value));}
export function paymentBase(){const url=new URL(process.env.STOREFRONT_URL||'https://www.stoffelspecas.com.br');if(url.protocol!=='https:')throw new AuthError('Endereço de pagamento inválido.',503);return url.origin;}
export async function createCheckout({user,body,gateway=createInfinitePayClient(),baseUrl=paymentBase()},pool=authPool()){
 if(!Object.hasOwn(sellers,user.seller_slug))throw new AuthError('Selecione seu atendimento antes de comprar.',403);
 const cart=shippingCart(body.items),destination=address(body.address),contactPhone=phone(body.phone);
 if(!uuid(body.clientKey))throw new AuthError('Identificador de compra inválido.');
 const requestHash=digest(JSON.stringify({cart,destination,contactPhone,quoteId:body.quoteId,serviceId:String(body.serviceId)}));
 let fresh=false;
 const order=await transaction(async client=>{
  // Serializa o mesmo identificador inclusive antes de existir um pedido.
  await client.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[user.id]);
  const existing=await client.query('select * from stoffels.orders where user_id=$1 and client_key=$2',[user.id,body.clientKey]);
  if(existing.rows[0]){if(existing.rows[0].request_hash!==requestHash)throw new AuthError('Esta tentativa já foi usada para outro carrinho. Recarregue o checkout.',409);return existing.rows[0];}
  const open=(await client.query("select count(*)::int total from stoffels.orders where user_id=$1 and status in ('pending','checkout_created')",[user.id])).rows[0].total;
  if(open>=3)throw new AuthError('Você já tem 3 pedidos aguardando pagamento. Acesse Minha conta para continuar um deles ou fale com a loja.',409);
  const {rows}=await client.query('select * from stoffels.products where id=any($1) order by id for update',[cart.map(x=>x.id)]);
  const items=priceCart(cart,rows.map(p=>({id:p.id,name:p.name,available:p.available&&!p.archived,stockQuantity:p.stock_quantity,priceCents:Number(p.price_cents)})));
  const shipping=await selectedShipping({quoteId:body.quoteId,serviceId:body.serviceId,cart,records:rows,cep:destination.cep},client);
  const subtotal=items.reduce((sum,p)=>sum+p.quantity*p.unitPriceCents,0),total=subtotal+shipping.priceCents;
  if(!Number.isSafeInteger(total)||total>100000000)throw new AuthError('Pedido acima do limite de compra online. Fale com a loja.');
  const saved=await client.query(`insert into stoffels.orders(user_id,client_key,request_hash,access_token_hash,subtotal_cents,shipping_cents,total_cents,shipping_method,shipping_details,shipping_quote_id,customer_name,customer_email,customer_phone,address,stock_reserved,seller_slug) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,true,$15) returning *`,[user.id,body.clientKey,requestHash,digest(randomBytes(32)),subtotal,shipping.priceCents,total,shipping.serviceId,JSON.stringify(shipping),body.quoteId,user.name,user.email,contactPhone,JSON.stringify(destination),user.seller_slug]);
  const savedOrder=saved.rows[0];
  for(const item of items){await client.query('insert into stoffels.order_items(order_id,product_id,quantity,unit_price_cents,name) values($1,$2,$3,$4,$5)',[savedOrder.id,item.productId,item.quantity,item.unitPriceCents,item.name]);await client.query('update stoffels.products set stock_quantity=stock_quantity-$1 where id=$2',[item.quantity,item.productId]);}
  await syncStock(client,cart.map(x=>x.id));fresh=true;return {...savedOrder,items};
 },pool);
 if(!fresh){if(order.checkout_url&&order.status==='checkout_created')return {id:order.id,url:order.checkout_url,status:order.status};return {id:order.id,url:null,status:order.status,checkoutState:order.checkout_state};}
 try{
  const payload=checkoutPayload({handle:process.env.INFINITEPAY_HANDLE||'stoffels',order:{id:order.id,shippingCents:Number(order.shipping_cents),totalCents:Number(order.total_cents),shippingLabel:order.shipping_details.carrier+' '+order.shipping_details.name},items:order.items,redirectUrl:baseUrl+'/pagamento?loja='+user.seller_slug+'&order_id='+order.id,webhookUrl:baseUrl+'/api/infinitepay-webhook?order_id='+order.id+'&token='+webhookToken(order.id),customer:{name:user.name,email:user.email,phone_number:'+55'+contactPhone},address:{cep:destination.cep,street:destination.street,neighborhood:destination.neighborhood,number:destination.number,complement:destination.complement}});
  const link=await gateway.createLink(payload);
  await pool.query("update stoffels.orders set checkout_url=$1,invoice_slug=coalesce(invoice_slug,$2),checkout_state='ready',status=case when status='pending' then 'checkout_created' else status end,updated_at=now() where id=$3",[link.url,link.slug,order.id]);
  return {id:order.id,url:link.url,status:'checkout_created'};
 }catch(error){
  await transaction(async client=>{
   const {rows}=await client.query('select * from stoffels.orders where id=$1 for update',[order.id]);
   if(rows[0].status==='paid')return;
   if(error.definitive){await releaseStock(client,rows[0]);await client.query("update stoffels.orders set status='failed',checkout_state='failed',updated_at=now() where id=$1",[order.id]);}
   else await client.query("update stoffels.orders set checkout_state='uncertain',updated_at=now() where id=$1",[order.id]);
  },pool);
  // Não repete criação às cegas: o provedor pode ter criado o link antes de uma falha de rede.
  return {id:order.id,url:null,status:error.definitive?'failed':'pending',checkoutState:error.definitive?'failed':'uncertain'};
 }
}
export async function verifyOrderPayment({orderId,transactionNsu,slug,gateway=createInfinitePayClient()},pool=authPool()){
 if(!uuid(orderId))throw new AuthError('Pedido inválido.');
 const {rows}=await pool.query('select * from stoffels.orders where id=$1',[orderId]);const order=rows[0];if(!order)throw new AuthError('Pedido não encontrado.',404);
 if(order.status==='paid'&&order.transaction_nsu===transactionNsu)return {paid:true};
 if(order.invoice_slug&&order.invoice_slug!==slug)throw new AuthError('Fatura não corresponde ao pedido.',409);
 const result=await gateway.checkPayment({handle:process.env.INFINITEPAY_HANDLE||'stoffels',orderId,transactionNsu,slug});
 if(!validPaymentResult(result,Number(order.total_cents)))return {paid:false};
 return transaction(async client=>{
  const locked=(await client.query('select * from stoffels.orders where id=$1 for update',[orderId])).rows[0];
  const prior=(await client.query('select order_id from stoffels.payment_events where transaction_nsu=$1',[transactionNsu])).rows[0];
  if(prior&&prior.order_id!==orderId)throw new AuthError('Transação já vinculada a outro pedido.',409);
  if(!prior)await client.query('insert into stoffels.payment_events(order_id,transaction_nsu,capture_method,amount_cents,verified,payload) values($1,$2,$3,$4,true,$5)',[orderId,transactionNsu,result.capture_method,result.amount,JSON.stringify({success:result.success,paid:result.paid,amount:result.amount,paid_amount:result.paid_amount,installments:result.installments,capture_method:result.capture_method})]);
  // Reserva nunca é liberada automaticamente enquanto há link ativo.
  let review=locked.payment_review||locked.status==='paid'&&locked.transaction_nsu!==transactionNsu;
  if(!locked.stock_reserved){
   const {rows:items}=await client.query('select product_id,quantity from stoffels.order_items where order_id=$1 order by product_id',[orderId]);
   for(const item of items){const stock=await client.query('update stoffels.products set stock_quantity=stock_quantity-$1 where id=$2 and stock_quantity>=$1 returning id',[item.quantity,item.product_id]);if(!stock.rowCount)review=true;}
   await syncStock(client,items.map(x=>x.product_id));
  }
  await client.query("update stoffels.orders set status='paid',paid_at=coalesce(paid_at,now()),transaction_nsu=coalesce(transaction_nsu,$1),invoice_slug=coalesce(invoice_slug,$2),stock_reserved=true,fulfillment_status=case when fulfillment_status='awaiting_payment' then 'processing' else fulfillment_status end,payment_review=$3,updated_at=now() where id=$4",[transactionNsu,slug,review,orderId]);
  return {paid:true};
 },pool);
}
