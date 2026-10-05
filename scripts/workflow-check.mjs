import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const dir=new URL('../.github/workflows/',import.meta.url);
for(const name of await readdir(dir)){
  const yaml=await readFile(new URL(name,dir),'utf8');
  assert(!yaml.includes('pull_request_target'),'Untrusted target workflow forbidden');
  const lines=yaml.split('\n');
  for(let index=0;index<lines.length;index++){
    const run=lines[index].match(/^\s*(?:-\s*)?run:\s*(.*)$/);
    if(!run)continue;
    let shell=run[1];
    if(/^[|>]/.test(shell)){
      const first=lines[index+1]?.match(/^(\s*)\S/);
      const indent=first?.[1].length??999;
      for(let next=index+1;next<lines.length;next++){
        if(lines[next].trim()&&lines[next].match(/^\s*/)[0].length<indent)break;
        shell+='\n'+lines[next];
      }
    }
    assert(!/\$\{\{\s*(?:github\.event\.(?:issue|pull_request)|inputs\.)[^}]*\}\}/.test(shell),'Do not interpolate external input into shell commands');
  }
  for(const action of yaml.matchAll(/uses:\s+([^\s]+)/g)){
    if(action[1].startsWith('./'))continue;
    assert(/@[a-f0-9]{40}$/.test(action[1]),`Unpinned action ${name}: ${action[1]}`);
  }
}
console.log('PASS: all external Actions pinned; no untrusted target trigger or shell input interpolation.');
