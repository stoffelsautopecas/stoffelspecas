import {adminSeller} from './sellers.js';
import { randomBytes } from 'node:crypto';
import { AuthError,authPool,normalizeEmail,digest } from './auth.js';
import { text,phone,uuid,transaction,orderView,releaseStock } from './commerce.js';
import { verifyOrderPayment } from './payments.js';
import { validatePaymentUrl } from './infinitepay.js';
import { estimateShipping } from './shipping-estimates.js';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function integer(value,min,max,label){if(!Number.isSafeInteger(value)||value<min||value>max)throw new AuthError(`Confira ${label}.`);return value;}
export function imagePath(value){
 if(typeof value!=='string'||value.length>1500)throw new AuthError('Foto inválida.');
 if(/^\/images\/[a-zA-Z0-9_./%-]+$/.test(value)&&!value.includes('..'))return value;
 if(/^\/api\/image\?id=[a-f0-9-]{36}$/.test(value))return value;
 let url;try{url=new URL(value);}catch{throw new AuthError('Informe uma foto enviada ou uma URL HTTPS.');}
 if(url.protocol!=='https:'||url.username||url.password||url.port)throw new AuthError('A foto precisa usar HTTPS.');return url.toString();
}
export async function saveProduct(body,pool=authPool()){
 const name=text(body.name,3,240,'nome'),brand=text(body.brand,0,100,'marca'),model=text(body.model,0,200,'modelo'),category=text(body.category,1,180,'categoria');
 const price=integer(body.priceCents,1,100000000,'preço'),original=integer(body.originalPriceCents??price,price,100000000,'preço original'),quantity=integer(body.stockQuantity,0,1000000,'estoque');
 const description=text(body.description,0,20000,'descrição');
 if(!Array.isArray(body.images)||!body.images.length||body.images.length>30)throw new AuthError('Inclua de 1 a 30 fotos.');
 const images=body.images.map(imagePath);
 let shipping;
 if(body.shipping){const s=body.shipping;shipping={weightGrams:integer(s.weightGrams,50,1000000,'peso'),lengthCm:integer(s.lengthCm,1,500,'comprimento'),widthCm:integer(s.widthCm,1,500,'largura'),heightCm:integer(s.heightCm,1,500,'altura'),estimated:s.estimated===true,reviewRequired:s.estimated===true,restricted:s.restricted===true,profile:'manual',confidence:s.estimated?'medium':'measured',version:'manual-v1'};}
 else shipping=estimateShipping({name,category});
 return transaction(async client=>{
  if(!(await client.query('select slug from stoffels.categories where slug=$1',[category])).rowCount)throw new AuthError('Selecione uma categoria existente.');
  let id=body.id,existing=null;
  if(id!==undefined){integer(id,1,999999999,'código');existing=(await client.query('select * from stoffels.products where id=$1 for update',[id])).rows[0];if(!existing)throw new AuthError('Peça não encontrada.',404);}
  else id=Number((await client.query("select nextval('stoffels.product_id_seq') id")).rows[0].id);
  const slug=existing?.slug||name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,180)+'-'+id;
  shipping.freeShipping=body.freeShipping===undefined?existing?.shipping?.freeShipping===true:body.freeShipping===true;
  const archived=body.archived===true,available=body.available!==false&&quantity>0&&!archived;
  const catalog={...(existing?.catalog||{}),id:String(id),slug,name,price:price/100,originalPrice:original/100,brand,model,category,available,featured:body.featured===true,freeShipping:shipping.freeShipping,image:images[0]};
  // Não se aceita HTML arbitrário do editor; texto vira parágrafos escapados.
  const details={...(existing?.details||{}),...catalog,images,description:description.split(/\n\s*\n/).map(p=>'<p>'+escape(p).replace(/\n/g,'<br>')+'</p>').join('')};
  await client.query(`insert into stoffels.products(id,slug,name,price_cents,original_price_cents,brand,model,available,category_slug,stock_quantity,shipping,catalog,details,archived,published) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) on conflict(id) do update set name=excluded.name,price_cents=excluded.price_cents,original_price_cents=excluded.original_price_cents,brand=excluded.brand,model=excluded.model,available=excluded.available,category_slug=excluded.category_slug,stock_quantity=excluded.stock_quantity,shipping=excluded.shipping,catalog=excluded.catalog,details=excluded.details,archived=excluded.archived,published=excluded.published,updated_at=now()`,[id,slug,name,price,original,brand,model,available,category,quantity,JSON.stringify(shipping),JSON.stringify(catalog),JSON.stringify(details),archived,body.available!==false]);
  await client.query('delete from stoffels.product_images where product_id=$1',[id]);for(const [position,path]of [...new Set(images)].entries())await client.query('insert into stoffels.product_images(product_id,path,position) values($1,$2,$3)',[id,path,position]);
  await client.query("update stoffels.categories c set product_count=(select count(*) from stoffels.products p where not p.archived and (p.category_slug=c.slug or starts_with(p.category_slug,c.slug||'/')))");
  return {id,catalog,details};
 },pool);
}
export async function adminGet(params,pool=authPool(),user){
 const seller=adminSeller(user);
 const view=params.get('view')||'summary';
 if(view==='uploads')return {uploads:(await pool.query("select u.id,u.created_at as \"createdAt\",'/api/image?id='||u.id::text as url from stoffels.product_uploads u where not exists(select 1 from stoffels.product_images i where i.path='/api/image?id='||u.id::text) order by u.created_at desc limit 20")).rows};
 if(view==='categories')return {categories:(await pool.query('select slug,name,product_count as count from stoffels.categories order by name')).rows};
 if(view==='summary'){
  const {rows}=await pool.query(`select (select count(*)::int from stoffels.products where not archived) products,(select count(*)::int from stoffels.users where role='customer' and seller_slug in ($1,'both')) customers,(select count(*)::int from stoffels.orders where seller_slug in ($1,'both')) orders,(select count(*)::int from stoffels.orders where seller_slug in ($1,'both') and status='paid' and fulfillment_status='processing') to_ship,(select coalesce(sum(total_cents),0)::float8 from stoffels.orders where seller_slug in ($1,'both') and status='paid') revenue_cents,(select count(*)::int from stoffels.orders where seller_slug in ($1,'both') and (checkout_state='uncertain' or payment_review)) attention,(select count(*)::int from stoffels.products where available and stock_quantity is null) unknown_stock`,[seller]);
  return {summary:rows[0]};
 }
 if(view==='products'){
  const id=params.get('id');if(id){if(!/^\d{1,9}$/.test(id))throw new AuthError('Código inválido.');const {rows}=await pool.query('select id,name,price_cents::float8 as "priceCents",original_price_cents::float8 as "originalPriceCents",brand,model,category_slug as category,stock_quantity as "stockQuantity",available,archived,published,shipping,catalog,details from stoffels.products where id=$1',[Number(id)]);if(!rows[0])throw new AuthError('Produto não encontrado.',404);return {product:rows[0]};}
  const page=Math.max(1,Math.min(10000,Number(params.get('page'))||1)),q='%'+(params.get('q')||'').slice(0,100)+'%',filter=params.get('filter')||'';
  const condition="(name ilike $1 or id::text=$2) and ($3='' or ($3='archived' and archived) or ($3='available' and available and not archived) or ($3='unavailable' and not available and not archived) or ($3='review' and shipping->>'reviewRequired'='true'))";
  const {rows}=await pool.query('select id,name,price_cents::float8 as "priceCents",stock_quantity as "stockQuantity",available,archived,catalog->>\'image\' as image from stoffels.products where '+condition+' order by id desc limit 20 offset $4',[q,(params.get('q')||'').slice(0,100),filter,(page-1)*20]);
  const count=await pool.query('select count(*)::int total from stoffels.products where '+condition,[q,(params.get('q')||'').slice(0,100),filter]);return {products:rows,total:count.rows[0].total,page};
 }
 if(view==='orders'){
  const id=params.get('id');if(id){if(!uuid(id))throw new AuthError('Pedido inválido.');const {rows}=await pool.query("select * from stoffels.orders where id=$1 and seller_slug in ($2,'both')",[id,seller]);if(!rows[0])throw new AuthError('Pedido não encontrado.',404);return {order:await orderView(pool,rows[0],true)};}
  const status=params.get('status')||'',q='%'+(params.get('q')||'').slice(0,100)+'%';
  const {rows}=await pool.query("select id,customer_name as \"customerName\",status,fulfillment_status as \"fulfillmentStatus\",total_cents::float8 as \"totalCents\",created_at as \"createdAt\",checkout_state as \"checkoutState\",payment_review as \"paymentReview\" from stoffels.orders where seller_slug in ($3,'both') and ($1='' or status=$1) and (customer_name ilike $2 or customer_email ilike $2 or id::text ilike $2) order by created_at desc limit 100",[status,q,seller]);return {orders:rows};
 }
 if(view==='customers'){const q='%'+(params.get('q')||'').slice(0,100)+'%';return {customers:(await pool.query("select u.id,u.name,u.email,u.phone,u.created_at,count(o.id)::int order_count from stoffels.users u left join stoffels.orders o on o.user_id=u.id and o.seller_slug in ($2,'both') where u.role='customer' and u.seller_slug in ($2,'both') and (u.name ilike $1 or u.email ilike $1) group by u.id order by u.created_at desc limit 100",[q,seller])).rows};}
 if(view==='settings')return {settings:(await pool.query("select value from stoffels.settings where key='store'")).rows[0].value};
 throw new AuthError('Página inválida.');
}
export async function adminPost(body,user,pool=authPool()){
 const seller=adminSeller(user);
 if(['order','cancel','verify-payment','recover-checkout','message'].includes(body.action)){
  if(!uuid(body.id))throw new AuthError('Pedido inválido.');
  if(!(await pool.query("select id from stoffels.orders where id=$1 and seller_slug in ($2,'both')",[body.id,seller])).rowCount)throw new AuthError('Pedido não encontrado.',404);
 }
 if(body.action==='product')return saveProduct(body.product,pool);
 if(body.action==='archive'){
  integer(body.id,1,999999999,'código');await transaction(async client=>{await client.query("update stoffels.products set archived=true,available=false,catalog=jsonb_set(catalog,'{available}','false'),details=jsonb_set(details,'{available}','false'),updated_at=now() where id=$1",[body.id]);await client.query("update stoffels.categories c set product_count=(select count(*) from stoffels.products p where not p.archived and (p.category_slug=c.slug or starts_with(p.category_slug,c.slug||'/')))");},pool);return {ok:true};
 }
 if(body.action==='category'){
  const slug=text(body.slug,2,180,'identificador da categoria'),name=text(body.name,2,100,'nome da categoria');if(!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(slug))throw new AuthError('Use letras minúsculas, números e hífens no identificador.');
  await pool.query('insert into stoffels.categories(slug,name,product_count) values($1,$2,0) on conflict(slug) do update set name=excluded.name',[slug,name]);return {ok:true};
 }
 if(body.action==='settings'){
  const v=body.settings||{},email=v.email?normalizeEmail(v.email):'';
  const settings={name:text(v.name,2,100,'nome da loja'),legalName:text(v.legalName,0,180,'razão social'),cnpj:text(v.cnpj,0,30,'CNPJ'),phone:phone(v.phone),email,address:text(v.address,5,300,'endereço da loja'),dispatchDays:integer(v.dispatchDays,0,30,'prazo de preparação')};
  await pool.query("update stoffels.settings set value=$1 where key='store'",[JSON.stringify(settings)]);return {ok:true};
 }
 if(body.action==='order'){
  if(!uuid(body.id))throw new AuthError('Pedido inválido.');
  return transaction(async client=>{
   const order=(await client.query('select * from stoffels.orders where id=$1 for update',[body.id])).rows[0];if(!order)throw new AuthError('Pedido não encontrado.',404);
   const fulfillment=text(body.fulfillmentStatus,1,30,'situação do envio');if(!['awaiting_payment','processing','shipped','delivered'].includes(fulfillment))throw new AuthError('Situação inválida.');
   if(fulfillment!=='awaiting_payment'&&order.status!=='paid')throw new AuthError('Só é possível preparar ou enviar pedidos com pagamento confirmado.',409);
   const trackingCode=text(body.trackingCode,0,100,'rastreio'),trackingUrl=text(body.trackingUrl,0,1000,'link de rastreio');
   if(trackingUrl){let url;try{url=new URL(trackingUrl);}catch{throw new AuthError('Link de rastreio inválido.');}if(url.protocol!=='https:'||url.username||url.password)throw new AuthError('Use um link HTTPS de rastreio.');}
   if(fulfillment==='shipped'&&!trackingCode&&!trackingUrl)throw new AuthError('Informe código ou link de rastreio para marcar como enviado.');
   await client.query('update stoffels.orders set fulfillment_status=$1,tracking_code=$2,tracking_url=$3,admin_note=$4,updated_at=now() where id=$5',[fulfillment,trackingCode,trackingUrl,text(body.adminNote,0,4000,'observação interna'),body.id]);return {ok:true};
  },pool);
 }
 if(body.action==='cancel'){
  if(!uuid(body.id))throw new AuthError('Pedido inválido.');return transaction(async client=>{
   const order=(await client.query('select * from stoffels.orders where id=$1 for update',[body.id])).rows[0];if(!order)throw new AuthError('Pedido não encontrado.',404);
   if(order.status==='paid')throw new AuthError('Faça o estorno pela InfinitePay antes de encerrar um pedido pago. O sistema não realiza estornos.',409);
   // Links ativos podem receber pagamento depois; a reserva é mantida nesses casos.
   if(order.checkout_state==='failed')await releaseStock(client,order);
   await client.query("update stoffels.orders set status='cancelled',updated_at=now() where id=$1",[body.id]);return {ok:true,reservationHeld:order.stock_reserved&&order.checkout_state!=='failed'};
  },pool);
 }
 if(body.action==='recover-user'){
  if(!uuid(body.id))throw new AuthError('Cliente inválido.');
  const row=(await pool.query("select id from stoffels.users where id=$1 and role='customer' and seller_slug in ($2,'both')",[body.id,seller])).rows[0];if(!row)throw new AuthError('Cliente não encontrado.',404);
  const token=randomBytes(32).toString('hex');await transaction(async client=>{await client.query('delete from stoffels.account_tokens where user_id=$1',[row.id]);await client.query("insert into stoffels.account_tokens(token_hash,user_id,expires_at) values($1,$2,now()+interval '1 hour')",[digest(token),row.id]);},pool);
  return {url:(process.env.STOREFRONT_URL||'https://www.stoffelspecas.com.br')+'/definir-senha?loja='+seller+'&token='+token};
 }
 if(body.action==='verify-payment'){if(!uuid(body.id))throw new AuthError('Pedido inválido.');return verifyOrderPayment({orderId:body.id,transactionNsu:body.transactionNsu,slug:body.slug},pool);}
 if(body.action==='recover-checkout'){
  if(!uuid(body.id))throw new AuthError('Pedido inválido.');const url=validatePaymentUrl(body.url),slug=body.slug?text(body.slug,1,150,'fatura'):null;
  if(slug&&!/^[a-zA-Z0-9_-]+$/.test(slug))throw new AuthError('Slug inválido.');
  const result=await pool.query("update stoffels.orders set checkout_url=$1,invoice_slug=coalesce(invoice_slug,$2),checkout_state='ready',status='checkout_created',updated_at=now() where id=$3 and checkout_state='uncertain' and status='pending'",[url,slug,body.id]);
  if(!result.rowCount)throw new AuthError('Este pedido não permite recuperação de link.',409);return {ok:true};
 }
 if(body.action==='message'){if(!uuid(body.id))throw new AuthError('Pedido inválido.');await pool.query('insert into stoffels.order_messages(order_id,user_id,body) values($1,$2,$3)',[body.id,user.id,text(body.message,2,2000,'mensagem')]);return {ok:true};}
 throw new AuthError('Ação inválida.');
}
