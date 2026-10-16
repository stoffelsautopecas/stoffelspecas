import { cp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
await stat(path.join(root, 'public/data/catalog.json'));
await rm(path.join(root, 'dist'), { recursive: true, force: true });
await mkdir(path.join(root, 'dist'), { recursive: true });
const imageBaseUrl = process.env.STOFFELS_IMAGE_BASE_URL || '';
if (imageBaseUrl && !/^https:\/\//.test(imageBaseUrl)) throw new Error('STOFFELS_IMAGE_BASE_URL deve usar HTTPS.');
await cp(path.join(root, 'public'), path.join(root, 'dist'), {
  recursive: true,
  filter: source => !imageBaseUrl || source !== path.join(root, 'public/images/products'),
});
await writeFile(path.join(root,'dist/assets/config.js'),`window.STOFFELS_CONFIG = ${JSON.stringify({imageBaseUrl,databaseApi:Boolean(process.env.DATABASE_URL)})};\n`);
console.log('Stoffels: build estático concluído em dist/.');
