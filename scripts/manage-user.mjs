// Operação restrita ao proprietário do servidor. Nunca recebe senha em argumentos.
import { normalizeEmail,hashPassword,authPool } from '../lib/auth.js';
import { closeDatabase } from '../lib/db/index.js';
const action=process.argv[2],email=normalizeEmail(process.argv[3]),seller=process.argv[4];
if(!['thiago','rennan'].includes(seller))throw new Error('Informe thiago ou rennan após o e-mail.');
if(!['admin','password'].includes(action)){console.error('Uso: node --env-file=.env.local scripts/manage-user.mjs admin|password email');process.exit(1);}
let password='';
try{
 if(process.stdin.isTTY){
  process.stdout.write('Nova senha (mínimo 12 caracteres; entrada oculta): ');
  process.stdin.setRawMode(true);process.stdin.resume();process.stdin.setEncoding('utf8');
  password=await new Promise((resolve,reject)=>{let value='';function read(chunk){for(const c of chunk){if(c==='\u0003'){cleanup();reject(new Error('Cancelado'));return;}if(c==='\r'||c==='\n'){cleanup();resolve(value);return;}if(c==='\u007f'){value=value.slice(0,-1);}else value+=c;}}function cleanup(){process.stdin.off('data',read);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');}process.stdin.on('data',read);});
 }else{for await(const chunk of process.stdin)password+=chunk;password=password.replace(/\r?\n$/,'');}
 const hash=await hashPassword(password);password='';const client=await authPool().connect();
 try{
  await client.query('begin');
  if(action==='admin')await client.query("insert into stoffels.users(name,email,password_hash,role,seller_slug) values('Administração Stoffels',$1,$2,'admin',$3) on conflict(email) where role='admin' do update set role='admin',password_hash=excluded.password_hash",[email,hash,seller]);
  else{const result=await client.query('update stoffels.users set password_hash=$1 where email=$2 and seller_slug=$3',[hash,email,seller]);if(!result.rowCount)throw new Error('Conta não encontrada.');}
  await client.query('delete from stoffels.sessions where user_id=(select id from stoffels.users where email=$1 and seller_slug=$2)',[email,seller]);await client.query('commit');
 }catch(e){await client.query('rollback');throw e;}finally{client.release();}
 console.log('Conta atualizada. Sessões anteriores encerradas.');
}catch(error){console.error('Falha:',error.code||error.message);process.exitCode=1;}finally{await closeDatabase();}
