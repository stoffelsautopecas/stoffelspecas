import { AuthError,requireUser,verifyOrigin,readJson,json } from '../lib/auth.js';
import { CheckoutError } from '../lib/infinitepay.js';
import { adminGet,adminPost } from '../lib/admin-store.js';
export default async function handler(req,res){try{
 const user=await requireUser(req,'admin');
 if(req.method==='GET'){json(res,200,{user,...await adminGet(new URL(req.url,'http://localhost').searchParams,undefined,user)});return;}
 if(req.method==='POST'){verifyOrigin(req);json(res,200,await adminPost(await readJson(req,65536),user));return;}
 res.setHeader('Allow','GET, POST');throw new AuthError('Método não permitido.',405);
}catch(error){json(res,error instanceof AuthError||error instanceof CheckoutError?error.status:503,{error:error instanceof AuthError||error instanceof CheckoutError?error.message:'Não foi possível atualizar a administração.'});}}
