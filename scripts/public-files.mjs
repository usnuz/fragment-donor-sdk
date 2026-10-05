import {readdir,readFile,lstat,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const ignored=new Set(['.git','.tools','.venv','venv','__pycache__','node_modules','dist','build','site','target','bin','obj','vendor','.smoke','.cache','.mypy_cache','.ruff_cache','.pytest_cache','tmp-gems','screenshots']);
const allowedRoots=new Set(['.github','contract','docs','publishing','scripts','python','typescript','php','dotnet','go','rust','ruby']);
const allowedTop=new Set(['README.md','LICENSE','CHANGELOG.md','CONTRIBUTING.md','.gitignore','composer.json']);
const rules=[['private key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['GitHub token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{60,})\b/],['Telegram bot token',/\b\d{8,12}:[A-Za-z0-9_-]{35}\b/],['URL credential',/https?:\/\/(?!SYNTHETIC)[^\s/@:]+:[^\s/@]+@/],['AWS access key',/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/]];
const entries=[];
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
    const content=await readFile(absolute,'utf8');
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
else console.log(`PASS: ${entries.length} allowlisted UTF-8 public source files; no parent history, runtime downloads, artifacts, environment files, or matched credentials.`);
