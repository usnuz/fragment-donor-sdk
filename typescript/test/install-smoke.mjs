// Pass the installed dist/index.js path; imports must resolve the packaged artifact.
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const target = process.argv[2];
if (!target) throw new Error("Pass the absolute installed dist/index.js path");
const { FragmentDonorClient } = await import(pathToFileURL(target).href);
let requests = 0;
const client = new FragmentDonorClient({
  fetch: async (_url, init) => {
    requests++;
    for (const key of ["Authorization", "X-Api-Key", "Mnemonic", "Cookie"])
      assert.equal(init.headers[key], undefined);
    return new Response(
      JSON.stringify({ ok: true, username: "durov", is_premium: false }),
    );
  },
});
assert.equal((await client.getUserInfo("durov")).username, "durov");
assert.equal(requests, 1);
console.log("Installed npm tarball smoke PASS (mocked HTTP, no purchase)");
