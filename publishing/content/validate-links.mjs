// Local content QA only; no network requests, posting or wallet operations.
import { readdir, readFile, access } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
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
  for (const match of content.matchAll(/https:\/\/usnuz\.github\.io\/fragment-donor-sdk\/[^\s)>]*\//g)) {
    const path = new URL(match[0]).pathname.slice("/fragment-donor-sdk/".length);
    await access(join(root, "site", path, "index.html"));
    references++;
  }
}
console.log(`PASS: ${files.length} Markdown assets, ${references} local/generated-doc link targets; no external publication implied.`);
