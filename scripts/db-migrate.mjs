import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { connectionOptions } from '../lib/db/index.js';
const client=new pg.Client(connectionOptions(process.env.DIRECT_URL));
try {
  await client.connect();
  const directory=new URL('../db/migrations/',import.meta.url);
  for(const file of (await readdir(directory)).filter(name=>name.endsWith('.sql')).sort())await client.query(await readFile(new URL(file,directory),'utf8'));
  const {rows}=await client.query("select tablename,rowsecurity from pg_tables where schemaname='stoffels' order by tablename");
  console.log('Estrutura Stoffels criada:',JSON.stringify(rows));
} catch(error){console.error('Migração falhou:',error.code||'DB_ERROR');process.exitCode=1;}
finally{await client.end().catch(()=>{});}
