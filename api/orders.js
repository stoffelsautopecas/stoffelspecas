import { AuthError,requireUser,authPool,verifyOrigin,readJson,rateLimit,json } from '../lib/auth.js';
import { CheckoutError } from '../lib/infinitepay.js';
import { uuid,text,orderView } from '../lib/commerce.js';
import { verifyOrderPayment } from '../lib/payments.js';
export default async function handler(req,res){try{
 const user=await requireUser(req),pool=authPool();
 if(req.method==='GET'){
  const id=new URL(req.url,'http://localhost').searchParams.get('id');
  if(id){if(!uuid(id))throw new AuthError('Pedido inválido.');const {rows}=await pool.query('select * from stoffels.orders where id=$1 and user_id=$2',[id,user.id]);if(!rows[0])throw new AuthError('Pedido não encontrado.',404);json(res,200,{order:await orderView(pool,rows[0])});}
  else{const {rows}=await pool.query('select id,status,fulfillment_status,total_cents::float8 as "totalCents",created_at as "createdAt" from stoffels.orders where user_id=$1 order by created_at desc limit 100',[user.id]);json(res,200,{orders:rows});}return;
 }
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');throw new AuthError('Método não permitido.',405);}
 verifyOrigin(req);const body=await readJson(req);if(!uuid(body.id))throw new AuthError('Pedido inválido.');
 const {rows}=await pool.query('select * from stoffels.orders where id=$1 and user_id=$2',[body.id,user.id]);if(!rows[0])throw new AuthError('Pedido não encontrado.',404);
 if(body.action==='verify'){await rateLimit(req,'verify-payment',user.email);json(res,200,await verifyOrderPayment({orderId:body.id,transactionNsu:body.transactionNsu,slug:body.slug}));return;}
 if(body.action==='message'){await rateLimit(req,'order-message',user.email);await pool.query('insert into stoffels.order_messages(order_id,user_id,body) values($1,$2,$3)',[body.id,user.id,text(body.message,2,2000,'mensagem')]);json(res,200,{ok:true});return;}
 throw new AuthError('Ação inválida.');
}catch(error){json(res,error instanceof AuthError||error instanceof CheckoutError?error.status:503,{error:error instanceof AuthError||error instanceof CheckoutError?error.message:'Não foi possível consultar seus pedidos.'});}}
