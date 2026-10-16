import { AuthError,readJson,json } from '../lib/auth.js';
import { validWebhookToken,verifyOrderPayment } from '../lib/payments.js';
export default async function handler(req,res){try{
 if(req.method!=='POST'){res.setHeader('Allow','POST');json(res,405,{error:'Método não permitido.'});return;}
 const url=new URL(req.url,'http://localhost'),id=url.searchParams.get('order_id');
 if(!validWebhookToken(id,url.searchParams.get('token')))throw new AuthError('Notificação não autorizada.',403);
 const body=await readJson(req,65536);if(body.order_nsu!==id)throw new AuthError('Pedido inválido.');
 const result=await verifyOrderPayment({orderId:id,transactionNsu:body.transaction_nsu,slug:body.invoice_slug});
 if(!result.paid)throw new AuthError('Pagamento ainda não confirmado.');json(res,200,{ok:true});
}catch(error){json(res,error.status===403?403:400,{error:'Não foi possível confirmar a notificação.'});}}
