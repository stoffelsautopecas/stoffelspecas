import { AuthError,json } from '../lib/auth.js';
import { lookupCep } from '../lib/cep.js';
export default async function handler(req,res){try{
 if(req.method!=='GET'){res.setHeader('Allow','GET');throw new AuthError('Método não permitido.',405);}
 const address=await lookupCep(new URL(req.url,'http://localhost').searchParams.get('cep'));
 res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','public, max-age=86400');res.statusCode=200;res.end(JSON.stringify(address));
}catch(error){json(res,error instanceof AuthError?error.status:503,{error:error instanceof AuthError?error.message:'Consulta indisponível. Preencha o endereço manualmente.'});}}
