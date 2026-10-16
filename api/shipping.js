import { AuthError,authPool,verifyOrigin,readJson,rateLimit,json } from '../lib/auth.js';
import { postalCode,shippingCart,quoteCartShipping,shippingFingerprint } from '../lib/shipping.js';
export default async function handler(req,res){
 try{
  if(req.method!=='POST'){res.setHeader('Allow','POST');throw new AuthError('Método não permitido.',405);}
  verifyOrigin(req);const body=await readJson(req);const cart=shippingCart(body?.items),cep=postalCode(body?.cep);
  await rateLimit(req,'shipping');
  const {rows}=await authPool().query('select id,available,price_cents,shipping from stoffels.products where id=any($1)',[cart.map(x=>x.id)]);
  const options=await quoteCartShipping({cart,records:rows,token:process.env.MELHOR_ENVIO_TOKEN,from:process.env.SHIPPING_ORIGIN_CEP||'97950000',to:cep});
  const saved=await authPool().query('insert into stoffels.shipping_quotes(cart_hash,postal_code,options) values($1,$2,$3) returning id,expires_at',[shippingFingerprint(cart,rows),cep,JSON.stringify(options)]);
  await authPool().query('delete from stoffels.shipping_quotes where expires_at<now()');
  json(res,200,{quoteId:saved.rows[0].id,expiresAt:saved.rows[0].expires_at,options,estimated:rows.some(p=>p.shipping?.estimated)});
 }catch(error){json(res,error instanceof AuthError?error.status:503,{error:error instanceof AuthError?error.message:'Não foi possível consultar o frete.'});}
}
