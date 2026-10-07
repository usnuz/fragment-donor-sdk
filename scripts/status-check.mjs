import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const report=JSON.parse(await readFile(new URL('../publishing/publication-status.json',import.meta.url),'utf8'));
assert.equal(report.version,'0.1.3');
assert.equal(report.no_real_payments,true);
const statuses=new Set(['PUBLISHED','SUBMITTED','SCHEDULED','READY','BLOCKED_ACCESS','NOT_ELIGIBLE','NOT_RUN']);
const ids=new Set();
for(const item of report.channels){
  assert(!ids.has(item.id),'Duplicate channel');ids.add(item.id);
  assert(statuses.has(item.status),'Invalid status');
  if(item.status==='PUBLISHED'||item.status==='SUBMITTED'||item.status==='SCHEDULED'){
    assert(item.url?.startsWith('https://'),'Verified URL required');
    assert(item.observed_at&&item.evidence.length,'Timestamp and evidence required');
  } else assert.equal(item.url,null,'A planned URL is not a publication URL');
}
console.log(`PASS: ${report.channels.length} channel states; no unverified published URLs.`);
