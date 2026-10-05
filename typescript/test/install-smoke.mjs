// Pass the installed dist/index.js path; imports must resolve the packaged artifact.
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
const target = process.argv[2];
if (!target) throw new Error("Pass the absolute installed dist/index.js path");
const {
  FragmentDonorClient,
  PurchaseOutcomeUnknownError,
  ValidationError,
  WalletCredentials,
} = await import(pathToFileURL(target).href);
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
const synthetic = new WalletCredentials({
  mnemonic: Array.from(
    { length: 12 },
    (_, index) => "SYNTHETIC" + String(index + 1).padStart(2, "0"),
  ).join(" "),
  cookie: "stel_ssid=SYNTHETIC_INSTALLED_SESSION",
});
for (const [method, quantity] of [
  ["buyStars", 50],
  ["buyPremium", 3],
]) {
  let calls = 0;
  const client = new FragmentDonorClient({
    credentials: synthetic,
    readonlyRetries: 2,
    autoWait: true,
    fetch: async () => {
      calls++;
      return new Response(
        JSON.stringify({
          ok: false,
          unconfirmed: true,
          tx_hash: "SYNTHETIC_INSTALLED_TX",
          info: "SYNTHETIC_UNCONFIRMED stel_ssid=SYNTHETIC_INSTALLED_SESSION",
        }),
        { status: 400 },
      );
    },
  });
  await assert.rejects(client[method]("durov", quantity), (error) => {
    assert.ok(error instanceof PurchaseOutcomeUnknownError);
    assert.equal(error instanceof ValidationError, false);
    assert.equal(error.purchaseOutcomeUnknown, true);
    assert.equal(error.body.tx_hash, "SYNTHETIC_INSTALLED_TX");
    assert.equal(error.message.includes("SYNTHETIC_INSTALLED_SESSION"), false);
    return true;
  });
  assert.equal(calls, 1);
}
console.log("Installed npm tarball smoke PASS (mocked HTTP, no purchase)");
