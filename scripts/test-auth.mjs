import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import handler from '../api/auth.js';
import adminHandler from '../api/admin.js';
import { authPool,hashPassword,verifyPassword,digest } from '../lib/auth.js';
import { closeDatabase } from '../lib/db/index.js';
const email=`auth-test-${randomUUID()}@example.invalid`,password='Test password! only 5931';
let cookie='';
async function request(body,options={}){
 const req=Readable.from(body===undefined?[]:[JSON.stringify(body)]);req.method=options.method||(body===undefined?'GET':'POST');req.headers={host:'localhost:3001',origin:'http://localhost:3001','content-type':'application/json',cookie:options.cookie??cookie,...options.headers};req.socket={remoteAddress:'test-'+email};
 const headers={};let raw;const res={setHeader:(k,v)=>{headers[k.toLowerCase()]=v;},end:value=>raw=value};
 await (options.admin?adminHandler:handler)(req,res);return {status:res.statusCode,body:JSON.parse(raw),headers};
}
try{
 const hash=await hashPassword(password);assert.notEqual(hash,await hashPassword(password));assert.ok(await verifyPassword(password,hash));assert.equal(await verifyPassword('wrong',hash),false);
 assert.equal((await request()).body.user,null);
 assert.equal((await request({action:'register',email,password,name:'Teste'},{headers:{origin:'https://evil.example'}})).status,403);
 assert.equal((await request({action:'register',email,password:'short',name:'Teste'})).status,400);
 let result=await request({action:'register',email,password,name:'Teste',role:'admin'});assert.equal(result.status,201);assert.equal(result.body.user.role,'customer');assert.equal('password_hash' in result.body.user,false);
 cookie=result.headers['set-cookie'].split(';')[0];assert.match(result.headers['set-cookie'],/HttpOnly/);assert.match(result.headers['set-cookie'],/SameSite=Lax/);
 const token=cookie.split('=')[1];const {rows}=await authPool().query('select s.token_hash,u.password_hash from stoffels.sessions s join stoffels.users u on u.id=s.user_id where u.email=$1',[email]);assert.equal(rows[0].token_hash,digest(token));assert.notEqual(rows[0].password_hash,password);
 assert.equal((await request()).body.user.email,email);
 assert.equal((await request(undefined,{admin:true})).status,403);
 assert.equal((await request(undefined,{admin:true,cookie:''})).status,401);
 assert.equal((await request({action:'login',email,password:'wrong'})).status,401);
 result=await request({action:'login',email,password},{cookie:''});assert.equal(result.status,200);const secondCookie=result.headers['set-cookie'].split(';')[0];assert.notEqual(secondCookie,cookie);
 assert.equal((await request({action:'password',currentPassword:'bad',password:'Another password! 123'})).status,401);
 result=await request({action:'password',currentPassword:password,password:'Another password! 123'});assert.equal(result.status,200);cookie=result.headers['set-cookie'].split(';')[0];
 assert.equal((await request(undefined,{cookie:secondCookie})).body.user,null);
 assert.equal((await request({action:'login',email,password})).status,401);
 await authPool().query("update stoffels.users set role='admin' where email=$1",[email]);assert.equal((await request(undefined,{admin:true})).status,200);
 assert.equal((await request({action:'logout'})).status,200);assert.equal((await request()).body.user,null);
 for(let i=0;i<12;i++)result=await request({action:'login',email,password:'wrong'});assert.equal(result.status,429);
 assert.equal((await request({action:'register',email,password,name:'Teste'},{method:'DELETE'})).status,405);
 console.log('Autenticação: hash com salt, cadastro sem elevação de privilégio, origem, sessão, permissões, troca de senha, revogação, logout e limite de tentativas verificados.');
}finally{
 await authPool().query('delete from stoffels.users where email=$1',[email]);
 const keys=['register','login','password'].flatMap(action=>[digest(`${action}:ip:test-${email}`),digest(`${action}:email:${email}`)]);
 await authPool().query('delete from stoffels.auth_limits where key=any($1)',[keys]);await closeDatabase();
}
