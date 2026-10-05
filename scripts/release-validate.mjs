import assert from 'node:assert/strict';
import {readFile,appendFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
const tag=process.env.SDK_RELEASE_TAG;
assert(/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(tag??''),'Explicit canonical stable vMAJOR.MINOR.PATCH tag required');
const version=tag.slice(1);
const text=file=>readFile(new URL('../'+file,import.meta.url),'utf8');
assert.equal(JSON.parse(await text('typescript/package.json')).version,version);
assert.equal(JSON.parse(await text('contract/fixtures.json')).version,version);
assert.equal(JSON.parse(await text('publishing/publication-status.json')).version,version);
for(const [file,regex]of [
  ['python/pyproject.toml',/^version\s*=\s*"([^"]+)"/m],
  ['rust/Cargo.toml',/^version\s*=\s*"([^"]+)"/m],
  ['ruby/lib/fragment_donor_sdk.rb',/^\s*VERSION\s*=\s*['"]([^'"]+)/m],
  ['go/client.go',/^const Version\s*=\s*"([^"]+)"/m],
  ['dotnet/src/FragmentDonor.Sdk/FragmentDonor.Sdk.csproj',/<Version>([^<]+)<\/Version>/]
])assert.equal((await text(file)).match(regex)?.[1],version,`${file} version mismatch`);
assert((await text('php/CHANGELOG.md')).includes(version));
assert((await text('go/CHANGELOG.md')).includes(version));
execFileSync('git',['merge-base','--is-ancestor','HEAD','origin/main']);
const remoteTag=execFileSync('git',['rev-parse',`refs/tags/${tag}^{commit}`],{encoding:'utf8'}).trim();
assert.equal(remoteTag,execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),'Checkout must be the exact immutable release tag');
console.log(`PASS: ${tag}, seven package metadata versions, tested-main ancestry and immutable checkout.`);
if(process.env.GITHUB_OUTPUT)await appendFile(process.env.GITHUB_OUTPUT,`commit=${remoteTag}\n`);
