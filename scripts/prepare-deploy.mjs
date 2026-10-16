import { cp, mkdir, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const destination=path.join(root,'.deploy');
await rm(destination,{recursive:true,force:true});
await mkdir(destination,{recursive:true});
const files=['api','lib','config','db','scripts','public','package.json','package-lock.json','vercel.json','.vercelignore','.env.example'];
for(const file of files)await cp(path.join(root,file),path.join(destination,file),{
  recursive:true,
  filter:source=>source!==path.join(root,'public/images/products')&&!source.includes('__pycache__')&&!source.startsWith(path.join(root,'db/clone')),
});
await mkdir(path.join(destination,'.vercel'),{recursive:true});
await cp(path.join(root,'.vercel/project.json'),path.join(destination,'.vercel/project.json'));
const project=JSON.parse(await readFile(path.join(destination,'.vercel/project.json'),'utf8'));
console.log('Pacote sem credenciais e sem fotos de produtos preparado em .deploy/. Projeto:',project.projectName);
