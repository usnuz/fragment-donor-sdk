# Fragment API Node.js integration: keep wallet credentials on the server

Audience: Node.js/TypeScript backend engineers. Tags: `typescript`, `nodejs`,
`api`, `security`. Status: READY draft; registry publication not assumed.

## Article

Disclosure: AI-assisted draft for Fragment Donor, an independent SDK/service,
not an official Telegram, Fragment or TON product. All tutorial payment behavior
should be demonstrated with mocks, not a live funded wallet.

The typed Node.js SDK targets Node 20+ and uses native `fetch`; it is not a browser
wallet library. Browsers restrict `Cookie` headers, and placing a mnemonic in
frontend configuration or localStorage exposes it to users and page scripts.
Purchase code belongs inside a trusted server.

After an actual npm release, installation is
`npm install fragment-donor-sdk@0.1.0`. Until then, use the clean source build:

```sh
git clone https://github.com/usnuz/fragment-donor-sdk.git
cd fragment-donor-sdk/typescript
npm ci
npm run build
```

A consumer can install that built directory with `npm install /absolute/path/to/typescript`.
The client is ESM and exports declarations matching its implementation.

```typescript
import {
  ApiError, FragmentDonorClient, TransportError, WalletCredentials,
} from "fragment-donor-sdk";

const publicClient = new FragmentDonorClient({ timeoutMs: 30_000 });
const user = await publicClient.getUserInfo("durov");
console.log(user.username, user.is_premium); // no service/wallet credentials

if (process.env.FRAGMENT_ALLOW_PURCHASES !== "yes") {
  throw new Error("Purchase disabled; use injected fetch mocks in this tutorial");
}
const credentials = new WalletCredentials({
  mnemonic: process.env.FRAGMENT_MNEMONIC!,
  cookie: process.env.FRAGMENT_COOKIE,
  walletVersion: "auto",
  providerKey: process.env.TONCONSOLE_API_KEY,
});
const client = new FragmentDonorClient({ credentials, timeoutMs: 30_000 });
try {
  await client.buyStars("durov", 50, { paymentMethod: "usdt_ton" });
  console.log("API responded to the intended purchase");
} catch (error) {
  if (error instanceof TransportError) {
    console.log("Reconcile first:", error.purchaseOutcomeUnknown);
  } else if (error instanceof ApiError) {
    console.log(error.name, error.status, error.retryAfter);
  } else throw error;
}
```

Do not copy secrets into the code. `providerKey` maps to optional TonConsole
`Api-Key`; there is no service `Authorization` or `X-Api-Key`. A purchase requires
both mnemonic and Fragment cookie, and uses form-urlencoded `username`, `amount`
and `payment_method`. Stars amount is 50–1,000,000, payment is `usdt_ton` or `ton`.

The client uses manual redirect handling, aborts after a configurable request
timeout and preserves unknown JSON fields and decimal balance strings. A custom
fetch implementation must preserve the no-redirect, no-secret-log and no-hidden-
retry rules. The wallet credential object's private fields and redacted display
are useful safeguards, not permission to log the actual transport headers.

The default shared IP limit is 30/minute. Read-only waiting/retries are explicit
and bounded; purchases never retry, including 429, 503, timeout or malformed reply.
No idempotency key can guarantee a repeated POST is harmless. Reconcile wallet
history and recipient state before intentionally submitting another purchase.

Purchase requests transmit wallet mnemonic and Fragment session/cookie data to
the API operator. SDK redaction applies to client-side diagnostics only. Keep the
entire flow server-side and use a dedicated, minimally funded wallet.

[Node source/tests](https://github.com/usnuz/fragment-donor-sdk/tree/main/typescript) ·
[Node documentation](https://usnuz.github.io/fragment-donor-sdk/en/sdk/typescript/) ·
[Credential handling](https://usnuz.github.io/fragment-donor-sdk/en/guides/credentials/).
