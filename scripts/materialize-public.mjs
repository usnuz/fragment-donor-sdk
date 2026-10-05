// Reproduce a scanned snapshot inside the isolated clone, not the backend repo.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const destination=join(root,'build','repository');
await readFile(join(destination,'.git','HEAD'),'utf8'); // Must be the explicit clone.
const entries=JSON.parse(await readFile(join(root,'build','public-export.json'),'utf8'));
for(const entry of entries){
  if(entry.type!=='blob'||entry.mode!=='100644'||entry.path.startsWith('/')||entry.path.includes('\\')||entry.path.split('/').some(p=>p==='..'||p==='.git'))throw new Error('Unsafe snapshot path');
  const target=resolve(destination,entry.path);
  if(!target.startsWith(destination+'/')&&!target.startsWith(destination+'\\'))throw new Error('Export path escaped clone');
  await mkdir(dirname(target),{recursive:true});
  if(entry.encoding==='base64'){
    if(!/^publishing\/media\/(?:0[1-5]-[a-z-]+\.png|walkthrough-en\.mp4)$/.test(entry.path))throw new Error('Unreviewed binary snapshot path');
    const bytes=Buffer.from(entry.content,'base64');
    if(bytes.toString('base64')!==entry.content)throw new Error('Noncanonical binary snapshot');
    await writeFile(target,bytes);
  }else{
    if(entry.encoding!==undefined)throw new Error('Unsupported snapshot encoding');
    await writeFile(target,entry.content,'utf8');
  }
}
console.log(`Materialized ${entries.length} scanned source files in isolated SDK clone.`);
