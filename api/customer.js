import { AuthError,requireUser,authPool,verifyOrigin,readJson,json } from '../lib/auth.js';
import { uuid,text,phone,address } from '../lib/commerce.js';
export default async function handler(req,res){try{
 const user=await requireUser(req);const pool=authPool();
 if(req.method==='GET'){
  const {rows}=await pool.query('select id,label,address from stoffels.addresses where user_id=$1 order by updated_at desc',[user.id]);
  const profile=await pool.query('select name,phone from stoffels.users where id=$1',[user.id]);json(res,200,{user:{...user,...profile.rows[0]},addresses:rows});return;
 }
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');throw new AuthError('Método não permitido.',405);}
 verifyOrigin(req);const body=await readJson(req);
 if(body.action==='profile'){await pool.query('update stoffels.users set name=$1,phone=$2 where id=$3',[text(body.name,2,100,'nome'),phone(body.phone),user.id]);}
 else if(body.action==='address'){
  const data=address(body.address),label=text(body.label,1,50,'nome do endereço');
  if(body.id){if(!uuid(body.id))throw new AuthError('Endereço inválido.');const result=await pool.query('update stoffels.addresses set label=$1,address=$2,updated_at=now() where id=$3 and user_id=$4',[label,JSON.stringify(data),body.id,user.id]);if(!result.rowCount)throw new AuthError('Endereço não encontrado.',404);}
  else{const {rows}=await pool.query('select count(*)::int total from stoffels.addresses where user_id=$1',[user.id]);if(rows[0].total>=10)throw new AuthError('Você pode salvar até 10 endereços.');await pool.query('insert into stoffels.addresses(user_id,label,address) values($1,$2,$3)',[user.id,label,JSON.stringify(data)]);}
 }else if(body.action==='delete-address'){if(!uuid(body.id))throw new AuthError('Endereço inválido.');await pool.query('delete from stoffels.addresses where id=$1 and user_id=$2',[body.id,user.id]);}
 else throw new AuthError('Ação inválida.');
 json(res,200,{ok:true});
}catch(error){json(res,error instanceof AuthError?error.status:503,{error:error instanceof AuthError?error.message:'Não foi possível atualizar a conta.'});}}
