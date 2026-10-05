import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL(name,import.meta.url),'utf8').then(JSON.parse);
const [fixtures,spec,collection,environment]=await Promise.all(['fixtures.json','openapi.json','postman.json','postman.environment.json'].map(read));
assert.deepEqual(spec.security,[]);
assert.equal(Object.keys(spec.paths).length,4);
assert(!spec.components?.securitySchemes,'Provider key must not become service authentication');
for(const operation of Object.values(fixtures.operations)){
  const schema=spec.paths[operation.path][operation.method.toLowerCase()];
  assert(schema);assert.deepEqual(schema.security,[]);
  if(operation.form)assert.deepEqual(schema.requestBody.content['application/x-www-form-urlencoded'].schema.required,operation.form.slice(0,2));
}
assert.equal(spec.paths['/buy-stars/'].post.requestBody.content['application/x-www-form-urlencoded'].schema.properties.amount.minimum,fixtures.limits.stars_min);
assert.equal(spec.paths['/buy-stars/'].post.requestBody.content['application/x-www-form-urlencoded'].schema.properties.amount.maximum,fixtures.limits.stars_max);
assert.deepEqual(spec.paths['/buy-premium/'].post.requestBody.content['application/x-www-form-urlencoded'].schema.properties.duration.enum,fixtures.limits.premium_durations);
assert.equal(collection.auth.type,'noauth');assert.equal(collection.item.length,4);
for(const item of collection.item){
  assert.equal(item.request.auth.type,'noauth');
  for(const status of [200,429,503])assert(item.response.some(r=>r.code===status));
  for(const saved of item.response)assert(saved.name.startsWith('MOCK —'));
  if(item.request.method==='POST'){
    assert(item.event[0].script.exec.join('\n').includes('I_UNDERSTAND_REAL_FUNDS'));
    assert(item.response.some(r=>r.code===400&&JSON.parse(r.body).unconfirmed===true));
  }
}
for(const vars of [collection.variable,environment.values]){
  for(const secret of ['mnemonic','fragment_cookie','tonconsole_key'])assert.equal(vars.find(v=>v.key===secret).value,'');
  assert.equal(vars.find(v=>v.key==='allow_real_purchases').value,'false');
}
assert.equal(environment._postman_variable_scope,'environment');
console.log('PASS: backend-aligned four-operation no-auth contract, guarded collection, synthetic saved responses, empty-secret environment.');
