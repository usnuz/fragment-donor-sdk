import {readdir,readFile,lstat,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ignored=new Set(['.git','.tools','.venv','venv','__pycache__','node_modules','dist','build','site','target','bin','obj','vendor','.smoke','.cache','.mypy_cache','.ruff_cache','.pytest_cache','tmp-gems','screenshots']);
const allowedRoots=new Set(['.github','contract','docs','publishing','scripts','demo','python','typescript','php','dotnet','go','rust','ruby']);
const allowedTop=new Set(['README.md','LICENSE','CHANGELOG.md','CONTRIBUTING.md','.gitignore','composer.json','global.json']);
const rules=[['private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['GitHub token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{60,})\b/],['Telegram bot token',/\b\d{8,12}:[A-Za-z0-9_-]{35}\b/],['URL credential',/https?:\/\/(?!SYNTHETIC)[^\s/@:]+:[^\s/@]+@/],['AWS access key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/]];
const entries=[];
const mediaManifest=JSON.parse(await readFile(join(root,'publishing/media/assets.json'),'utf8'));
const binaryMedia=new Map(mediaManifest.assets.filter(item=>/^(?:0[1-5]-[a-z-]+\.png|walkthrough-en\.mp4)$/.test(item.file)).map(item=>['publishing/media/'+item.file,item]));
if(binaryMedia.size!==6)throw new Error('Exactly five reviewed PNG frames and one reviewed video required');
async function walk(directory,prefix=''){
  for(const item of (await readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
    if(ignored.has(item.name)||item.name.startsWith('.smoke-')||item.name.endsWith('.egg-info')||item.name==='composer.lock')continue;
    const path=prefix+item.name;
    if(!prefix&&!allowedRoots.has(item.name)&&!allowedTop.has(item.name))throw new Error(`Unreviewed public root: ${path}`);
    const absolute=join(directory,item.name);
    if((await lstat(absolute)).isSymbolicLink())throw new Error(`Symlink forbidden: ${path}`);
    if(item.isDirectory()){await walk(absolute,path+'/');continue;}
    if(/(?:\.pyc|\.gem|\.tgz|\.whl|\.nupkg|\.zip|\.pdb|\.class|\.crate)$/.test(path))continue;
    if(/(?:\.exe|\.dll)$/.test(path))throw new Error(`Unexpected runtime in source: ${path}`);
    if(item.name.startsWith('.env')&&item.name!=='.env.example')throw new Error(`Environment secret file: ${path}`);
    if(item.name==='local-access.json')continue;
    const bytes=await readFile(absolute);
    const media=binaryMedia.get(path);
    if(media){
      if(bytes.length!==media.bytes||bytes.length>8_000_000||createHash('sha256').update(bytes).digest('hex')!==media.sha256)throw new Error(`Reviewed media identity changed: ${path}`);
      if(path.endsWith('.png')&&!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('Invalid reviewed PNG');
      if(path.endsWith('.mp4')&&bytes.subarray(4,8).toString('ascii')!=='ftyp')throw new Error('Invalid reviewed MP4');
      for(const [name,regex]of rules)if(regex.test(bytes.toString('latin1')))throw new Error(`Potential ${name} in reviewed media; contents withheld`);
      entries.push({path,mode:'100644',type:'blob',encoding:'base64',content:bytes.toString('base64')});
      continue;
    }
    const content=bytes.toString('utf8');
    if(content.includes('\u0000')||content.includes('\ufffd'))throw new Error(`Binary/non-UTF8 file: ${path}`);
    for(const [name,regex]of rules)if(regex.test(content))throw new Error(`Potential ${name} in ${path}; contents withheld`);
    entries.push({path,mode:'100644',type:'blob',content});
  }
}
const snapshotChunk=process.argv.find(arg=>arg.startsWith('--snapshot-chunk='));
if(!snapshotChunk)await walk(root);
const serialized=snapshotChunk?await readFile(join(root,'build','public-export.json'),'utf8'):JSON.stringify(entries);
const chunk=snapshotChunk||process.argv.find(arg=>arg.startsWith('--chunk='));
if(chunk){
  const index=Number(chunk.split('=')[1]);
  if(!Number.isInteger(index)||index<0)throw new Error('Invalid export chunk');
  process.stdout.write(JSON.stringify(serialized.slice(index*12000,(index+1)*12000)));
}else if(process.argv.includes('--snapshot')){
  await mkdir(join(root,'build'),{recursive:true});
  await writeFile(join(root,'build','public-export.json'),serialized);
  process.stdout.write(JSON.stringify({files:entries.length,characters:serialized.length,chunks:Math.ceil(serialized.length/12000),sha256:createHash('sha256').update(serialized).digest('hex')}));
}else if(process.argv.includes('--summary'))process.stdout.write(JSON.stringify({files:entries.length,characters:serialized.length,chunks:Math.ceil(serialized.length/12000)}));
else if(process.argv.includes('--json'))process.stdout.write(serialized);
else console.log(`PASS: ${entries.length} allowlisted public files including six hash-bound reviewed media assets; no parent history, runtime downloads, package artifacts, environment files, or matched credentials.`);
