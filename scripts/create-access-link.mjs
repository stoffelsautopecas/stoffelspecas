import { randomBytes } from 'node:crypto';
import { authPool,digest,normalizeEmail } from '../lib/auth.js';
import { closeDatabase } from '../lib/db/index.js';
const email=normalizeEmail(process.argv[2]);
try{
 const {rows}=await authPool().query('select id from stoffels.users where email=$1',[email]);if(!rows[0])throw new Error('Conta não encontrada.');
 const token=randomBytes(32).toString('hex');await authPool().query('delete from stoffels.account_tokens where user_id=$1',[rows[0].id]);
 await authPool().query("insert into stoffels.account_tokens(token_hash,user_id,expires_at) values($1,$2,now()+interval '24 hours')",[digest(token),rows[0].id]);
 console.log((process.env.STOREFRONT_URL||'https://stoffels.vercel.app')+'/definir-senha?token='+token);
}catch(error){console.error(error.message);process.exitCode=1;}finally{await closeDatabase();}
