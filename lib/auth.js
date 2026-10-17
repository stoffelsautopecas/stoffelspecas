import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { getDatabase } from './db/index.js';
const scrypt=promisify(scryptCallback);
const parameters={N:32768,r:8,p:1,maxmem:64*1024*1024};
export class AuthError extends Error {constructor(message,status=400){super(message);this.status=status;}}
export const digest=value=>createHash('sha256').update(value).digest('hex');
export const authPool=()=>getDatabase().$client;
export function validatePassword(password){if(typeof password!=='string'||password.length<12||Buffer.byteLength(password)>256)throw new AuthError('Use uma senha de pelo menos 12 caracteres e no máximo 256 bytes.');}
export function normalizeEmail(value){const email=typeof value==='string'?value.trim().toLowerCase():'';if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email))throw new AuthError('Informe um e-mail válido.');return email;}
export async function hashPassword(password){validatePassword(password);const salt=randomBytes(16).toString('hex');const key=await scrypt(password,salt,64,parameters);return `scrypt$${salt}$${key.toString('hex')}`;}
export async function verifyPassword(password,encoded){
 if(typeof password!=='string'||Buffer.byteLength(password)>256)return false;
 const [algorithm,salt,hash]=String(encoded).split('$');
 if(algorithm!=='scrypt'||!/^\w{32}$/.test(salt)||!/^[a-f0-9]{128}$/.test(hash))return false;
 const key=await scrypt(password,salt,64,parameters);return timingSafeEqual(key,Buffer.from(hash,'hex'));
}
export function cookieName(req){return process.env.VERCEL||req.socket?.encrypted?'__Host-stoffels_session':'stoffels_session';}
export function sessionToken(req){const name=cookieName(req);const value=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1);return /^[a-f0-9]{64}$/.test(value||'')?value:null;}
export function sessionCookie(req,token,maxAge=604800){const secure=cookieName(req).startsWith('__Host-');return `${cookieName(req)}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure?'; Secure':''}`;}
export async function currentUser(req,client=authPool()){
 const token=sessionToken(req);if(!token)return null;
 const {rows}=await client.query('select u.id,u.name,u.email,u.role,u.seller_slug from stoffels.sessions s join stoffels.users u on u.id=s.user_id where s.token_hash=$1 and s.expires_at>now()',[digest(token)]);const user=rows[0];if(user?.role==='customer'&&req.headers['x-stoffels-seller']&&user.seller_slug!=='both'&&user.seller_slug!==req.headers['x-stoffels-seller'])return null;return user||null;
}
export async function requireUser(req,role){const user=await currentUser(req);if(!user)throw new AuthError('Entre na sua conta para continuar.',401);if(role&&user.role!==role)throw new AuthError('Acesso restrito à administração.',403);return user;}
export function verifyOrigin(req,contentType=/^application\/json(?:;|$)/i){
 const origin=req.headers.origin;
 const host=process.env.VERCEL?req.headers.host:(req.headers.host||'localhost');
 const expected=`${process.env.VERCEL||req.socket?.encrypted?'https':'http'}://${host}`;
 if(!origin||origin!==expected||req.headers['sec-fetch-site']==='cross-site')throw new AuthError('Solicitação não autorizada.',403);
 if(!contentType.test(req.headers['content-type']||''))throw new AuthError('Envie os dados como JSON.',415);
}
export async function readJson(req,maxBytes=8192){
 // Vercel pode fornecer o corpo já interpretado; o servidor local fornece stream.
 if(req.body!==undefined){const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body);if(Buffer.byteLength(raw)>maxBytes)throw new AuthError('Dados muito grandes.',413);try{return JSON.parse(raw);}catch{throw new AuthError('JSON inválido.');}}
 let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>maxBytes)throw new AuthError('Dados muito grandes.',413);}try{return JSON.parse(raw);}catch{throw new AuthError('JSON inválido.');}
}
export async function rateLimit(req,action,email=''){
 // Só o cabeçalho injetado pela Vercel é confiável; no localhost usa a conexão.
 const ip=process.env.VERCEL?String(req.headers['x-vercel-forwarded-for']||'unknown').split(',')[0]:req.socket?.remoteAddress||'local';
 const keys=[{key:digest(`${action}:ip:${ip}`),max:action==='register'?10:40},...(email?[{key:digest(`${action}:email:${email}`),max:10}]:[])];
 for(const {key,max} of keys){const {rows}=await authPool().query(`insert into stoffels.auth_limits(key,attempts) values($1,1) on conflict(key) do update set attempts=case when auth_limits.window_start<now()-interval '15 minutes' then 1 else auth_limits.attempts+1 end,window_start=case when auth_limits.window_start<now()-interval '15 minutes' then now() else auth_limits.window_start end returning attempts`,[key]);if(rows[0].attempts>max)throw new AuthError('Muitas tentativas. Aguarde 15 minutos e tente novamente.',429);}
 await authPool().query("delete from stoffels.auth_limits where window_start<now()-interval '1 day'");
}
export async function createSession(req,res,user,client=authPool()){
 const token=randomBytes(32).toString('hex');
 await client.query("delete from stoffels.sessions where expires_at<now() or token_hash=$1",[digest(sessionToken(req)||'')]);
 await client.query("insert into stoffels.sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '7 days')",[digest(token),user.id]);
 res.setHeader('Set-Cookie',sessionCookie(req,token));
}
export function json(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.end(JSON.stringify(data));}
