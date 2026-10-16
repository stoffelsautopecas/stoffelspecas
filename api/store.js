import { AuthError,authPool,json } from '../lib/auth.js';
export default async function handler(req,res){try{
 if(req.method!=='GET'){res.setHeader('Allow','GET');throw new AuthError('Método não permitido.',405);}
 const {rows}=await authPool().query("select value from stoffels.settings where key='store'");
 json(res,200,{settings:rows[0].value,checkoutEnabled:process.env.CHECKOUT_ENABLED==='true'});
}catch(error){json(res,error.status||503,{error:'Informações da loja indisponíveis.'});}}
