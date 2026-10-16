import assert from 'node:assert/strict';
import { randomUUID,randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import sharp from 'sharp';
import customer from '../api/customer.js';
import orders from '../api/orders.js';
import admin from '../api/admin.js';
import image from '../api/image.js';
import auth from '../api/auth.js';
import webhook from '../api/infinitepay-webhook.js';
import { authPool,digest } from '../lib/auth.js';
import { closeDatabase } from '../lib/db/index.js';
const marker=randomUUID(),users=[0,1,2].map(i=>({id:randomUUID(),email:`commerce-test-${marker}-${i}@example.invalid`,token:randomBytes(32).toString('hex'),role:i===2?'admin':'customer'}));
const orderId=randomUUID();
async function request(handler,{user=users[0],method='GET',path='/',body,raw,headers={}}={}){
 const req=Readable.from(raw?[raw]:body?[JSON.stringify(body)]:[]);req.method=method;req.url=path;req.headers={host:'localhost:3001',origin:'http://localhost:3001','content-type':'application/json',...(user?{cookie:'stoffels_session='+user.token}:{}),...headers};req.socket={remoteAddress:marker};let data;const responseHeaders={};const res={setHeader:(k,v)=>responseHeaders[k.toLowerCase()]=v,end:value=>data=value};await handler(req,res);return {status:res.statusCode,headers:responseHeaders,data:Buffer.isBuffer(data)?data:JSON.parse(data)};
}
try{
 for(const u of users){await authPool().query("insert into stoffels.users(id,name,email,password_hash,role) values($1,'Teste temporário de permissões',$2,'unused-test-hash',$3)",[u.id,u.email,u.role]);await authPool().query("insert into stoffels.sessions(token_hash,user_id,expires_at) values($1,$2,now()+interval '1 hour')",[digest(u.token),u.id]);}
 await authPool().query("insert into stoffels.orders(id,user_id,access_token_hash,subtotal_cents,shipping_cents,total_cents,customer_name,customer_email) values($1,$2,'unused',100,0,100,'Teste temporário de permissões',$3)",[orderId,users[0].id,users[0].email]);
 const destination={receiver:'Teste temporário',cep:'97950000',street:'Rua Comandai',number:'1287',neighborhood:'Centro',city:'Guarani das Missões',state:'RS',complement:''};
 assert.equal((await request(customer,{method:'POST',body:{action:'address',label:'Teste',address:destination}})).status,200);
 const profile=(await request(customer)).data;const addressId=profile.addresses[0].id;assert.equal(profile.addresses.length,1);
 assert.equal((await request(customer,{user:users[1]})).data.addresses.length,0);
 assert.equal((await request(customer,{user:users[1],method:'POST',body:{action:'address',id:addressId,label:'Inválido',address:destination}})).status,404);
 await request(customer,{user:users[1],method:'POST',body:{action:'delete-address',id:addressId}});assert.equal((await request(customer)).data.addresses.length,1);
 assert.equal((await request(orders,{path:'/?id='+orderId})).status,200);
 assert.equal((await request(orders,{user:users[1],path:'/?id='+orderId})).status,404);
 assert.equal((await request(orders,{user:null,path:'/?id='+orderId})).status,401);
 assert.equal((await request(orders,{user:users[1],method:'POST',body:{action:'message',id:orderId,message:'Não autorizado'}})).status,404);
 assert.equal((await request(admin,{method:'POST',body:{action:'product',product:{}}})).status,403);
 assert.equal((await request(admin,{user:users[2]})).status,200);
 const png=await sharp({create:{width:2,height:2,channels:3,background:'#cc0000'}}).png().toBuffer();
 const uploaded=await request(image,{user:users[2],method:'POST',raw:png,headers:{'content-type':'image/png'}});assert.equal(uploaded.status,201);
 const photo=await request(image,{user:null,path:uploaded.data.url});assert.equal(photo.status,200);assert.equal(photo.headers['content-type'],'image/webp');assert.equal((await sharp(photo.data).metadata()).format,'webp');
 assert.equal((await request(image,{user:users[2],method:'POST',raw:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'),headers:{'content-type':'image/png'}})).status,400);
 assert.equal((await request(image,{method:'POST',raw:png,headers:{'content-type':'image/png'}})).status,403);
 assert.equal((await request(webhook,{user:null,method:'POST',path:'/?order_id='+orderId+'&token='+'0'.repeat(64),body:{order_nsu:orderId}})).status,403);
 const token=randomBytes(32).toString('hex');await authPool().query("insert into stoffels.account_tokens(token_hash,user_id,expires_at) values($1,$2,now()+interval '1 hour')",[digest(token),users[0].id]);
 const reset=await request(auth,{method:'POST',body:{action:'reset',token,password:'New private password! 812'}});assert.equal(reset.status,200);assert.equal((await request(auth)).data.user,null);
 assert.equal((await request(auth,{method:'POST',body:{action:'reset',token,password:'New private password! 813'}})).status,400);
 console.log('APIs: isolamento de endereços/pedidos entre clientes, acesso administrativo, upload/reprocessamento de imagem, rejeição de SVG, webhook inválido e recuperação de senha de uso único verificados. Fixtures removidas ao terminar.');
}finally{
 await authPool().query('delete from stoffels.product_uploads where created_by=any($1::uuid[])',[users.map(x=>x.id)]);
 await authPool().query('delete from stoffels.order_messages where order_id=$1',[orderId]);await authPool().query('delete from stoffels.orders where id=$1',[orderId]);
 await authPool().query('delete from stoffels.users where id=any($1::uuid[])',[users.map(x=>x.id)]);
 await authPool().query('delete from stoffels.auth_limits where key=any($1)',[[digest('reset:ip:'+marker)]]);await closeDatabase();
}
