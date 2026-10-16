import pg from 'pg';
import { readFile } from 'node:fs/promises';
import { connectionOptions } from '../lib/db/index.js';
const client=new pg.Client(connectionOptions(process.env.DIRECT_URL));
const json=async name=>JSON.parse(await readFile(new URL('../public/data/'+name,import.meta.url),'utf8'));
try {
  await client.connect();await client.query('begin');
  for(const c of await json('categories.json'))await client.query('insert into stoffels.categories(slug,name,product_count) values($1,$2,$3) on conflict(slug) do update set name=excluded.name, product_count=excluded.product_count',[c.slug,c.name,c.count]);
  const catalog=await json('catalog.json');
  for(let offset=0;offset<catalog.length;offset+=100) {
    const batch=catalog.slice(offset,offset+100);
    const records=await Promise.all(batch.map(async p=>{
      const details=await json('products/'+p.id+'.json');
      return {id:Number(p.id),slug:p.slug,name:p.name,price_cents:Math.round(p.price*100),original_price_cents:Math.round(p.originalPrice*100),brand:p.brand,model:p.model,available:p.available,category_slug:p.category,catalog:p,details};
    }));
    await client.query(`insert into stoffels.products(id,slug,name,price_cents,original_price_cents,brand,model,available,category_slug,catalog,details)
      select id,slug,name,price_cents,original_price_cents,brand,model,available,category_slug,catalog,details
      from jsonb_to_recordset($1::jsonb) as x(id integer,slug text,name text,price_cents bigint,original_price_cents bigint,brand text,model text,available boolean,category_slug text,catalog jsonb,details jsonb)
      on conflict(id) do update set slug=excluded.slug,name=excluded.name,price_cents=excluded.price_cents,original_price_cents=excluded.original_price_cents,brand=excluded.brand,model=excluded.model,available=excluded.available,category_slug=excluded.category_slug,catalog=excluded.catalog,details=excluded.details,updated_at=now()`,[JSON.stringify(records)]);
    const images=records.flatMap(p=>p.details.images.map((path,position)=>({product_id:p.id,path,position})));
    await client.query(`insert into stoffels.product_images(product_id,path,position) select product_id,path,position from jsonb_to_recordset($1::jsonb) as x(product_id integer,path text,position integer) on conflict(product_id,path) do update set position=excluded.position`,[JSON.stringify(images)]);
    if(offset%1000===0)console.log('Produtos importados:',Math.min(offset+100,catalog.length),'/',catalog.length);
  }
  await client.query('commit');
  const {rows}=await client.query("select (select count(*) from stoffels.products)::int as products,(select count(*) from stoffels.product_images)::int as images,(select count(*) from stoffels.categories)::int as categories,pg_size_pretty(pg_database_size(current_database())) as database_size");
  console.log('Importação concluída:',JSON.stringify(rows[0]));
} catch(error){await client.query('rollback').catch(()=>{});console.error('Importação falhou:',error.code||'DB_ERROR');process.exitCode=1;}
finally{await client.end().catch(()=>{});}
