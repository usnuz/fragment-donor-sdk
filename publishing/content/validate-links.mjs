// Local content QA only; no network requests, posting or wallet operations.
import { readdir, readFile, access } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const siteRoot = join(root, "site");
function siteTarget(text) {
  const url = new URL(text.replace(/[.,;]+$/, ""));
  assert.equal(url.origin, "https://sdk.donor.uz");
  assert.equal(url.username + url.password, "");
  const prefix = "/";
  assert(url.pathname.startsWith(prefix), "Unexpected public docs prefix");
  const path = decodeURIComponent(url.pathname.slice(prefix.length));
  const target = resolve(siteRoot, path, ...(path.endsWith("/") || !path ? ["index.html"] : []));
  assert(target.startsWith(siteRoot + "/") || target.startsWith(siteRoot + "\\"), "Docs link escaped generated site");
  return target;
}
// Directory pages and literal static files must not be confused.
assert.equal(siteTarget("https://sdk.donor.uz/en/"), join(siteRoot, "en", "index.html"));
assert.equal(siteTarget("https://sdk.donor.uz/demo/media/docs-uz-baseline.jpg"), join(siteRoot, "demo", "media", "docs-uz-baseline.jpg"));
assert.equal(siteTarget("https://sdk.donor.uz/openapi.json"), join(siteRoot, "openapi.json"));
assert.throws(() => siteTarget("https://usnuz.github.io/fragment-donor-sdk/en/"));
assert.throws(() => siteTarget("https://example.com/fragment-donor-sdk/en/"));
assert.throws(() => siteTarget("https://sdk.donor.uz/%2f..%2foutside"));
const files = (await readdir(here)).filter((name) => name.endsWith(".md"));
files.push("../PLATFORM_MATRIX.md");
let references = 0;
for (const name of files) {
  const file = resolve(here, name);
  const content = await readFile(file, "utf8");
  for (const match of content.matchAll(/\]\(([^\s)]+)\)/g)) {
    const target = match[1];
    if (/^[a-z]+:/i.test(target) || target.startsWith("#")) continue;
    await access(resolve(dirname(file), decodeURIComponent(target.split("#")[0])));
    references++;
  }
  for (const match of content.matchAll(/https:\/\/sdk\.donor\.uz\/[^\s)>"`\]]*/g)) {
    await access(siteTarget(match[0]));
    references++;
  }
}
console.log(`PASS: ${files.length} Markdown assets, ${references} local/generated-doc link targets; no external publication implied.`);
