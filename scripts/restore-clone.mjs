import pg from 'pg';
import {readFile} from 'node:fs/promises';
import {connectionOptions} from '../lib/db/index.js';
const target=process.env.DIRECT_URL||process.env.DATABASE_URL;
if(!target)throw new Error('Configure o NOVO banco na .env.local antes da restauração.');
if(target.includes('zrbesvvkgshauufkmmen'))throw new Error('Restauração bloqueada: este é o banco da loja original.');
const data=JSON.parse(await readFile(new URL('../db/clone/catalog-snapshot.json',import.meta.url),'utf8'));
const client=new pg.Client(connectionOptions(target));
try{await client.connect();await client.query('begin');for(const table of ['products','users','orders']){const {rows:[r]}=await client.query('select count(*)::int as count from stoffels.'+table);if(r.count)throw new Error('Use um banco novo, sem produtos, usuários ou pedidos.');}
for(const table of ['categories','products','product_images','settings']){await client.query('delete from stoffels.'+table);for(let i=0;i<data[table].length;i+=100)await client.query(`insert into stoffels.${table} select * from jsonb_populate_recordset(null::stoffels.${table},$1::jsonb)`,[JSON.stringify(data[table].slice(i,i+100))]);}
await client.query("select setval('stoffels.product_id_seq',greatest(coalesce((select max(id) from stoffels.products),1),1))");await client.query('commit');console.log('Catálogo restaurado no novo banco:',data.products.length,'produtos.');}catch(e){await client.query('rollback').catch(()=>{});throw e;}finally{await client.end();}
