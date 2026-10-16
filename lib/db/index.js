import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { readFileSync } from 'node:fs';
import * as schema from './schema.js';

export function connectionOptions(connectionString) {
  if (!connectionString) throw new Error('DATABASE_URL não configurada');
  const url = new URL(connectionString);
  for (const key of ['sslmode','sslrootcert','sslcert','sslkey']) url.searchParams.delete(key);
  return {connectionString:url.toString(),ssl:{ca:readFileSync(new URL('../../config/certs/supabase-ca.crt',import.meta.url),'utf8'),rejectUnauthorized:true},connectionTimeoutMillis:15000};
}
let pool, database;
export function getDatabase() {
  if(!database) {
    pool = new pg.Pool({...connectionOptions(process.env.DATABASE_URL),max:2,idleTimeoutMillis:10000});
    pool.on('error',()=>{});
    database = drizzle(pool,{schema});
  }
  return database;
}
export async function closeDatabase(){if(pool)await pool.end();pool=undefined;database=undefined;}
