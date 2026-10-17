import {requestSeller} from '../lib/sellers.js';
import { AuthError,authPool,currentUser,requireUser,verifyOrigin,readJson,rateLimit,normalizeEmail,hashPassword,verifyPassword,createSession,sessionCookie,sessionToken,digest,json } from '../lib/auth.js';
// Hash fictício com custo igual ao das senhas reais, para contas inexistentes.
const dummy='scrypt$00000000000000000000000000000000$'+'00'.repeat(64);
export default async function handler(req,res){
 try{
  if(req.method==='GET'){json(res,200,{user:await currentUser(req)});return;}
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');throw new AuthError('Método não permitido.',405);}
  verifyOrigin(req);const body=await readJson(req);
  if(!body||typeof body!=='object'||Array.isArray(body))throw new AuthError('Dados inválidos.');
  const {action}=body;
  if(!['register','login','logout','password','reset'].includes(action))throw new AuthError('Ação inválida.');
  if(action==='reset'){
   await rateLimit(req,'reset');
   if(!/^[a-f0-9]{64}$/.test(body.token||''))throw new AuthError('Link inválido ou expirado.');
   const hash=await hashPassword(body.password),client=await authPool().connect();
   try{await client.query('begin');
    const {rows}=await client.query('select * from stoffels.account_tokens where token_hash=$1 and expires_at>now() for update',[digest(body.token)]);
    if(!rows[0])throw new AuthError('Link inválido ou expirado.');
    const user=(await client.query('update stoffels.users set password_hash=$1 where id=$2 returning id,name,email,role,seller_slug',[hash,rows[0].user_id])).rows[0];
    await client.query('delete from stoffels.sessions where user_id=$1',[user.id]);await client.query('delete from stoffels.account_tokens where user_id=$1',[user.id]);await createSession(req,res,user,client);await client.query('commit');json(res,200,{user});return;
   }catch(e){await client.query('rollback');throw e;}finally{client.release();}
  }
  if(action==='logout'){
   const token=sessionToken(req);if(token)await authPool().query('delete from stoffels.sessions where token_hash=$1',[digest(token)]);
   res.setHeader('Set-Cookie',sessionCookie(req,'',0));json(res,200,{user:null});return;
  }
  if(action==='password'){
   const user=await requireUser(req);await rateLimit(req,action,user.email);
   const hash=await hashPassword(body.password);const client=await authPool().connect();
   try{
    await client.query('begin');
    const {rows}=await client.query('select password_hash from stoffels.users where id=$1 for update',[user.id]);
    if(!rows[0]||!await verifyPassword(body.currentPassword,rows[0].password_hash))throw new AuthError('Senha atual incorreta.',401);
    // A sessão pode ter sido revogada enquanto esta solicitação aguardava o bloqueio.
    if(!await currentUser(req,client))throw new AuthError('Entre novamente para alterar a senha.',401);
    await client.query('update stoffels.users set password_hash=$1 where id=$2',[hash,user.id]);
    await client.query('delete from stoffels.sessions where user_id=$1',[user.id]);await createSession(req,res,user,client);await client.query('commit');
   }catch(e){await client.query('rollback');throw e;}finally{client.release();}
   json(res,200,{user,message:'Senha alterada. Os outros acessos foram encerrados.'});return;
  }
  const email=normalizeEmail(body.email);await rateLimit(req,action,email);
  if(action==='login'){
   const client=await authPool().connect();
   try{
    await client.query('begin');
    const {rows}=await client.query('select id,name,email,role,seller_slug,password_hash from stoffels.users where email=$1 and (role=\'admin\' or seller_slug=$2 or seller_slug=\'both\') order by role asc limit 1 for update',[email,requestSeller(req)]);
    if(!await verifyPassword(body.password,rows[0]?.password_hash||dummy)||!rows[0])throw new AuthError('E-mail ou senha incorretos.',401);
    const {password_hash,...user}=rows[0];await createSession(req,res,user,client);await client.query('commit');json(res,200,{user});return;
   }catch(e){await client.query('rollback');throw e;}finally{client.release();}
  }
  const seller=body.seller;if(!['thiago','rennan','both'].includes(seller))throw new AuthError('Escolha Thiago, Rennan ou Não fui atendido.');
  const name=typeof body.name==='string'?body.name.trim():'';
  if(name.length<2||name.length>100)throw new AuthError('Informe seu nome (2 a 100 caracteres).');
  const hash=await hashPassword(body.password);
  const client=await authPool().connect();
  try{
   await client.query('begin');
   const {rows}=await client.query("insert into stoffels.users(name,email,password_hash,role,seller_slug) values($1,$2,$3,'customer',$4) returning id,name,email,role,seller_slug",[name,email,hash,seller]);
   await createSession(req,res,rows[0],client);await client.query('commit');json(res,201,{user:rows[0]});
  }catch(e){await client.query('rollback');if(e.code==='23505')throw new AuthError('Não foi possível cadastrar este e-mail. Tente entrar ou fale com a loja.',409);throw e;}finally{client.release();}
 }catch(error){json(res,error instanceof AuthError?error.status:503,{error:error instanceof AuthError?error.message:'O acesso à conta está indisponível. Tente novamente.'});}
}
