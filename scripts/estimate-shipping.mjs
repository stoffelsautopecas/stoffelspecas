import { writeFile,mkdir } from 'node:fs/promises';
import { authPool } from '../lib/auth.js';
import { closeDatabase } from '../lib/db/index.js';
import { estimateShipping } from '../lib/shipping-estimates.js';
const apply=process.argv.includes('--apply');
try{
 const {rows}=await authPool().query('select id,name,category_slug as category,shipping from stoffels.products order by id');
 const report=rows.map(p=>({id:p.id,name:p.name,category:p.category,...(p.shipping&&!p.shipping.estimated?p.shipping:{...estimateShipping(p),freeShipping:p.shipping?.freeShipping===true})}));
 await mkdir('reports',{recursive:true});
 await writeFile('reports/shipping-estimates.json',JSON.stringify(report,null,2)+'\n');
 if(apply){
  const client=await authPool().connect();try{
   await client.query('begin');
   for(let i=0;i<report.length;i+=400){const batch=report.slice(i,i+400).map(({id,name,category,...shipping})=>({id,shipping}));await client.query("update stoffels.products p set shipping=b.shipping from jsonb_to_recordset($1::jsonb) as b(id int,shipping jsonb) where p.id=b.id and (p.shipping is null or p.shipping->>'estimated'='true')",[JSON.stringify(batch)]);}
   await client.query('commit');
  }catch(e){await client.query('rollback');throw e;}finally{client.release();}
 }
 const counts={};for(const p of report)counts[p.profile]=(counts[p.profile]||0)+1;
 console.log(JSON.stringify({total:report.length,applied:apply,lowConfidence:report.filter(p=>p.confidence==='low').length,restricted:report.filter(p=>p.restricted).length,profiles:counts}));
}finally{await closeDatabase();}
