import sharp from 'sharp';
import { AuthError,authPool,requireUser,verifyOrigin,json } from '../lib/auth.js';
import { uuid } from '../lib/commerce.js';
export const config={api:{bodyParser:false}};
export default async function handler(req,res){try{
 if(req.method==='GET'){
  const id=new URL(req.url,'http://localhost').searchParams.get('id');if(!uuid(id))throw new AuthError('Imagem inválida.');
  const {rows}=await authPool().query('select content,mime from stoffels.product_uploads where id=$1',[id]);if(!rows[0])throw new AuthError('Imagem não encontrada.',404);
  res.statusCode=200;res.setHeader('Content-Type',rows[0].mime);res.setHeader('Cache-Control','public, max-age=31536000, immutable');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'none'; sandbox");res.end(rows[0].content);return;
 }
 if(req.method!=='POST'){res.setHeader('Allow','GET, POST');throw new AuthError('Método não permitido.',405);}
 const user=await requireUser(req,'admin');verifyOrigin(req,/^image\/(jpeg|png|webp)(?:;|$)/i);
 const chunks=[];let size=0;if(Buffer.isBuffer(req.body)){chunks.push(req.body);size=req.body.length;}if(size>4*1024*1024)throw new AuthError('Envie uma imagem de até 4 MB.',413);for await(const chunk of req){size+=chunk.length;if(size>4*1024*1024)throw new AuthError('Envie uma imagem de até 4 MB.',413);chunks.push(chunk);}
 const original=Buffer.concat(chunks);
 const isJpeg=original.subarray(0,3).equals(Buffer.from([0xff,0xd8,0xff])),isPng=original.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),isWebp=original.toString('ascii',0,4)==='RIFF'&&original.toString('ascii',8,12)==='WEBP';
 if(!isJpeg&&!isPng&&!isWebp)throw new AuthError('Envie uma imagem JPEG, PNG ou WebP válida.');
 let content;try{content=await sharp(original,{limitInputPixels:40000000,animated:false}).rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();}catch{throw new AuthError('A imagem precisa ser um arquivo JPEG, PNG ou WebP válido.');}
 if(content.length>2*1024*1024)throw new AuthError('A imagem é muito grande. Reduza sua resolução.');
 const usage=await authPool().query('select pg_database_size(current_database())::float8 bytes');if(usage.rows[0].bytes>400*1024*1024)throw new AuthError('Espaço de fotos próximo do limite. Fale com o administrador.',409);
 const {rows}=await authPool().query('insert into stoffels.product_uploads(content,created_by) values($1,$2) returning id',[content,user.id]);json(res,201,{url:'/api/image?id='+rows[0].id});
}catch(error){json(res,error instanceof AuthError?error.status:503,{error:error instanceof AuthError?error.message:'Não foi possível enviar a foto.'});}}
