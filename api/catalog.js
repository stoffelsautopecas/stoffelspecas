import { eq } from 'drizzle-orm';
import { getDatabase } from '../lib/db/index.js';
import { products, categories } from '../lib/db/schema.js';
export default async function handler(req,res) {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='GET'){res.setHeader('Allow','GET');res.statusCode=405;res.end(JSON.stringify({error:'Método não permitido'}));return;}
  try {
    const db=getDatabase();
    const [items,groups]=await Promise.all([db.select({catalog:products.catalog}).from(products).where(eq(products.archived,false)).orderBy(products.id),db.select({slug:categories.slug,name:categories.name,count:categories.count}).from(categories)]);
    res.setHeader('Cache-Control','public, max-age=0, must-revalidate');
    res.setHeader('Vercel-CDN-Cache-Control','public, s-maxage=30, stale-while-revalidate=60');
    res.statusCode=200;res.end(JSON.stringify({products:items.map(x=>x.catalog),categories:groups}));
  }catch{res.statusCode=503;res.end(JSON.stringify({error:'Catálogo temporariamente indisponível'}));}
}
