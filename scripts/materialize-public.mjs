// Reproduce a scanned snapshot inside the isolated clone, not the backend repo.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const destination=join(root,'build','repository');
await readFile(join(destination,'.git','HEAD'),'utf8'); // Must be the explicit clone.
const entries=JSON.parse(await readFile(join(root,'build','public-export.json'),'utf8'));
const snapshotBinary=entries.filter(entry=>entry.encoding==='base64');
if(snapshotBinary.length!==7||snapshotBinary.filter(entry=>entry.path==='publishing/media/docs-uz-baseline.jpg').length!==1)throw new Error('Exactly seven reviewed media binaries, including one baseline JPEG, required');
const seenPaths=new Set();
for(const entry of entries){
  if(entry.type!=='blob'||entry.mode!=='100644'||entry.path.startsWith('/')||entry.path.includes('\\')||entry.path.split('/').some(p=>p==='..'||p==='.git'))throw new Error('Unsafe snapshot path');
  if(seenPaths.has(entry.path))throw new Error('Duplicate snapshot path');
  seenPaths.add(entry.path);
  if(entry.path==='publishing/media/docs-uz-baseline.jpg'&&entry.encoding!=='base64')throw new Error('Baseline JPEG must use the reviewed binary exception');
  const target=resolve(destination,entry.path);
  if(!target.startsWith(destination+'/')&&!target.startsWith(destination+'\\'))throw new Error('Export path escaped clone');
  await mkdir(dirname(target),{recursive:true});
  if(entry.encoding==='base64'){
    const baselineJpeg=entry.path==='publishing/media/docs-uz-baseline.jpg';
    if(!baselineJpeg&&!/^publishing\/media\/(?:0[1-5]-[a-z-]+\.png|walkthrough-en\.mp4)$/.test(entry.path))throw new Error('Unreviewed binary snapshot path');
    const bytes=Buffer.from(entry.content,'base64');
    if(bytes.toString('base64')!==entry.content)throw new Error('Noncanonical binary snapshot');
    if(baselineJpeg&&(bytes.length!==117338||createHash('sha256').update(bytes).digest('hex')!=='c8e6dd90b653f8043ea83266dc2b7536327fb8b0c56b37400ae0b5261396133b'||!bytes.subarray(0,3).equals(Buffer.from([255,216,255]))||!bytes.subarray(-2).equals(Buffer.from([255,217]))))throw new Error('Reviewed baseline JPEG identity/magic changed; content withheld');
    await writeFile(target,bytes);
  }else{
    if(entry.encoding!==undefined)throw new Error('Unsupported snapshot encoding');
    await writeFile(target,entry.content,'utf8');
  }
}
console.log(`Materialized ${entries.length} scanned source files in isolated SDK clone.`);
