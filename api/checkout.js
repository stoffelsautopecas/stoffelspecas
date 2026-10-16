import { AuthError,requireUser,verifyOrigin,readJson,rateLimit,json } from '../lib/auth.js';
import { CheckoutError } from '../lib/infinitepay.js';
import { createCheckout } from '../lib/payments.js';
export default async function handler(req,res){try{
 if(req.method!=='POST'){res.setHeader('Allow','POST');throw new AuthError('Método não permitido.',405);}
 verifyOrigin(req);const user=await requireUser(req);await rateLimit(req,'checkout',user.email);
 if(process.env.CHECKOUT_ENABLED!=='true'||!process.env.CHECKOUT_WEBHOOK_SECRET)throw new AuthError('O pagamento está temporariamente indisponível.',503);
 const body=await readJson(req);json(res,200,await createCheckout({user,body}));
}catch(error){json(res,error instanceof AuthError||error instanceof CheckoutError?error.status:503,{error:error instanceof AuthError||error instanceof CheckoutError?error.message:'Não foi possível iniciar o pagamento. Tente novamente.'});}}
