import { and,eq } from 'drizzle-orm';
import { getDatabase } from '../lib/db/index.js';
import { products } from '../lib/db/schema.js';
export default async function handler(req,res) {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET'){res.setHeader('Allow','GET');res.statusCode=405;res.end(JSON.stringify({error:'Método não permitido'}));return;}
  const id=new URL(req.url,'http://localhost').searchParams.get('id');
  if(!/^\d{1,9}$/.test(id||'')){res.statusCode=400;res.end(JSON.stringify({error:'Produto inválido'}));return;}
  try {
    const [row]=await getDatabase().select({details:products.details}).from(products).where(and(eq(products.id,Number(id)),eq(products.archived,false))).limit(1);
    if(!row){res.statusCode=404;res.end(JSON.stringify({error:'Produto não encontrado'}));return;}
    res.setHeader('Cache-Control','no-store');
    res.statusCode=200;res.end(JSON.stringify(row.details));
  }catch{res.statusCode=503;res.end(JSON.stringify({error:'Produto temporariamente indisponível'}));}
}
