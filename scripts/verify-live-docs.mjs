// Read-only public documentation checks. Never touches the payment API.
import assert from 'node:assert/strict';
import {languages,pages} from '../docs/content.mjs';
const base='https://usnuz.github.io/fragment-donor-sdk/';
const targets=[{path:'',lang:'en'},...languages.flatMap(lang=>pages.map(page=>({lang,page,path:`${lang}/${page.slug?`${page.slug}/`:''}`})))];
let next=0,passed=0;
async function check(target){
  const url=base+target.path;
  const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200,`HTTP ${response.status}: ${url}`);
  const html=await response.text();
  assert(html.includes(`<html lang="${target.lang}">`),`Wrong language: ${url}`);
  assert(html.includes(`<link rel="canonical" href="${url}">`),`Wrong canonical: ${url}`);
  assert(html.includes('<h1>')&&html.includes('<main'),'Missing static main content');
  assert(!/<meta[^>]*noindex/i.test(html),'Unexpected noindex');
  assert(!/<script(?![^>]*type="application\/ld\+json")/i.test(html),'Executable script dependence');
  if(target.page){
    for(const alt of languages){
      const altUrl=base+`${alt}/${target.page.slug?`${target.page.slug}/`:''}`;
      assert(html.includes(`hreflang="${alt}" href="${altUrl}"`),`Missing ${alt} alternate: ${url}`);
    }
    const defaultUrl=target.page.slug?base+`en/${target.page.slug}/`:base;
    assert(html.includes(`hreflang="x-default" href="${defaultUrl}"`),`Wrong x-default: ${url}`);
  }
  passed++;
}
await Promise.all(Array.from({length:4},async()=>{
  while(next<targets.length){const target=targets[next++];await check(target);}
}));
for(const path of ['sitemap.xml','robots.txt','openapi.json','postman.json','postman.environment.json']){
  const response=await fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200,path);
  const body=await response.text();
  if(path==='sitemap.xml')assert.equal((body.match(/<loc>/g)||[]).length,targets.length);
  if(path==='openapi.json'){const spec=JSON.parse(body);assert.deepEqual(spec.security,[]);assert.equal(Object.keys(spec.paths).length,4);}
  if(path==='postman.json'){const spec=JSON.parse(body);assert.equal(spec.auth.type,'noauth');assert.equal(spec.variable.find(v=>v.key==='allow_real_purchases').value,'false');}
  if(path==='postman.environment.json'){const env=JSON.parse(body);for(const key of ['mnemonic','fragment_cookie','tonconsole_key'])assert.equal(env.values.find(v=>v.key===key).value,'');}
}
const demoResponse=await fetch(base+'demo/',{redirect:'manual',signal:AbortSignal.timeout(15000)});
assert.equal(demoResponse.status,200,'Demo must be public');
const demo=await demoResponse.text();
assert(demo.includes('STATIC MOCK · NO REAL PAYMENT')&&demo.includes("connect-src 'none'; form-action 'none'"),'Demo trust boundary');
assert(!/<script\b/i.test(demo),'Demo must be static');
for(const path of ['demo/media/01-overview.png','demo/media/walkthrough-en.mp4','demo/media/docs-uz-baseline.jpg']){
  const response=await fetch(base+path,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200,path);
}
const baselineResponse=await fetch(base+'demo/media/docs-uz-baseline.jpg',{redirect:'manual',signal:AbortSignal.timeout(15000)});
assert.equal(baselineResponse.status,200,'Baseline screenshot must be public');
const baselineBytes=Buffer.from(await baselineResponse.arrayBuffer());
assert.equal(baselineBytes.length,117338,'Baseline screenshot bytes changed');
const {createHash}=await import('node:crypto');
assert.equal(createHash('sha256').update(baselineBytes).digest('hex'),'c8e6dd90b653f8043ea83266dc2b7536327fb8b0c56b37400ae0b5261396133b','Baseline screenshot hash changed');
console.log(`PASS: ${passed} live static pages + synthetic demo/media + sitemap/robots/OpenAPI/Postman; HTTP 200, language/canonical/hreflang and no executable JS.`);
