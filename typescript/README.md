# Fragment Donor SDK for Node.js / TypeScript

`fragment-donor-sdk` 0.1.2 provides typed server-side clients for the independent
[Fragment Donor API](https://fragment.donor.uz). This is not an official
Telegram, Fragment, or TON product. Node.js 20+, ESM, no runtime dependencies.

Registry release may still be pending; check the repository publication status.
After release:

```sh
npm install fragment-donor-sdk@0.1.2
```

No service account or login is required.
`providerKey` supplies optional TonConsole `Api-Key` only. It is not a service key.

## Quick start and four methods

```typescript
import { FragmentDonorClient, WalletCredentials } from "fragment-donor-sdk";

const publicClient = new FragmentDonorClient({ timeoutMs: 30_000 });
const user = await publicClient.getUserInfo("durov"); // no credentials needed
console.log(user.username, user.is_premium);

// Read secrets on your trusted server from a deployment secret manager.
const credentials = new WalletCredentials({
  mnemonic: process.env.FRAGMENT_MNEMONIC!,
  cookie: process.env.FRAGMENT_COOKIE,
  walletVersion: "auto", // auto | v5r1 | v4r2 | v3r2
  walletAddress: process.env.FRAGMENT_WALLET_ADDRESS,
  providerKey: process.env.TONCONSOLE_API_KEY,
});
const client = new FragmentDonorClient({ credentials });
const balance = await client.walletBalance(); // GET; Cookie is never sent
console.log(balance.ton, balance.usdt_ton);    // exact decimal strings

// These methods spend funds; execute only after deliberate purchase approval.
// const stars = await client.buyStars("durov", 50, { paymentMethod: "usdt_ton" });
// const premium = await client.buyPremium("durov", 3, { paymentMethod: "ton" });
```

Stars: integer 50–1,000,000; Premium: 3, 6, or 12 months. Payment methods:
`usdt_ton` (default), `ton`. Credential options also support `proxy` and
`userAgent` for purchase requests. Per-call credentials can override the client:
`client.buyStars("durov", 50, { credentials })`.
Mnemonic must have 12/18/24 words. The backend additionally accepts POST
`/wallet-balance/`; this client uses GET. Purchase bodies are form-urlencoded.
Response interfaces include `[key: string]: unknown` to retain future fields.
Do not convert balances to `Number`; use a decimal library for arithmetic.

## Flood wait, errors, and retries

```typescript
import { ApiError, FloodWaitError, TransportError } from "fragment-donor-sdk";

try {
  await client.getUserInfo("durov");
} catch (error) {
  if (error instanceof FloodWaitError) console.log("Retry after", error.retryAfter);
  else if (error instanceof TransportError) console.log("Uncertain purchase:", error.purchaseOutcomeUnknown);
  else if (error instanceof ApiError) console.log(error.name, error.status);
  else throw error;
}
```

Also exported: `ValidationError`, `ServiceUnavailableError`,
`MalformedResponseError`, `PurchaseOutcomeUnknownError`. All SDK errors have sanitized `body`, `status`,
`errorCode`, `retryAfter`, and `purchaseOutcomeUnknown`.
`Retry-After` seconds/HTTP-date and JSON `retry_after`/`flood_wait` are understood;
conflicting valid hints use the longest wait.

All four operations share one per-IP limit, normally 30 requests/minute.
Automatic retries and waiting default to off. Read-only retry requires both
`readonlyRetries` (0–2) and `autoWait: true`, e.g.:

```typescript
const client = new FragmentDonorClient({ readonlyRetries: 2, autoWait: true, maxWaitSeconds: 60 });
```

A wait greater than `maxWaitSeconds` (0–60) returns the error without shortening
the server hint. PURCHASES NEVER RETRY automatically, including 429/503.
A timeout, reset, malformed response, or 5xx can follow a successful purchase;
inspect real wallet and delivery history before deciding to submit again.
There is no backend idempotency-key guarantee.

An HTTP 400 purchase reply with `unconfirmed: true` raises
`PurchaseOutcomeUnknownError`, **not** `ValidationError`, with
`purchaseOutcomeUnknown: true`. Safe `tx_hash`, `info`, and additional fields
remain in `body`; reconcile before another intentional purchase. A 400 status
does not establish that funds were not spent. Normal input rejection still uses
`ValidationError`.

## Timeouts and injected transports

`timeoutMs` (default 30,000) uses AbortController for each attempt, including body
reading. Native Node fetch obeys its signal; a custom transport must also obey
`init.signal`, disable redirects/hidden retries, and avoid credential logging.
The SDK cannot interrupt a custom promise that ignores abort. Retry sleeps and
later attempts have separate budgets; timeout does not undo a remote transfer.

Native fetch has no portable SDK-level connect-timeout option. If your own trusted
transport supports a separate connection phase, explicitly inject it and set
`connectTimeoutMs`. The SDK passes `{ connectTimeoutMs }` as the third transport
argument; the transport must enforce the value and clean up its socket timers.
Setting it without an injected transport is rejected, avoiding a silently ignored
configuration. Existing two-argument transports remain compatible when no
separate connection setting is requested. No extra runtime dependency is added.

```typescript
// `enforcingTransport` implements HttpTransport and enforces both the AbortSignal
// and the third argument's connectTimeoutMs; never forward secrets on redirect.
// const client = new FragmentDonorClient({
//   fetch: enforcingTransport, timeoutMs: 30_000, connectTimeoutMs: 5_000,
// });
```

## Server-only credential handling

Do not bundle purchase code into browsers: browser Cookie header restrictions
make that flow unsuitable, and wallet mnemonics must never reach frontend code,
localStorage, public environment variables, analytics, or screenshots.
Runtime constructor rejects browser execution. Keep credentials inside a
trusted Node.js service.

Credential objects use private fields and redacted inspect/JSON output.
Known credential echoes and sensitive server keys are redacted before SDK errors
or results escape. No telemetry exists. An injected `fetch` receives actual
headers and must not log them. The `headers()` method is for transport use only;
explicitly printing its return value exposes secrets.
Redirects are always `manual`; HTTPS is required except local test servers.

Purchase requests transmit the wallet mnemonic and Fragment session/cookie to
the API operator. Keep secrets server-side.

## Development and release

```sh
npm ci
npm test                   # build + strict typecheck + mocked runtime tests
npm pack --dry-run
npm pack
npm run check:artifacts    # inspect exact tarball paths and known-secret patterns
```

The shared `../contract/fixtures.json` drives mocked HTTP tests; no wallet funds
are spent. Development TypeScript is pinned in package-lock.json.
The executable example defaults to reads only. Spending requires both
`FRAGMENT_ALLOW_PURCHASES=yes` and `FRAGMENT_PURCHASE_KIND=stars` or `premium`;
only one selected gift executes. Missing/invalid selection fails before dispatch.
Never enable spending in CI or a demonstration. Inspect the
tarball for only dist, examples, README, changelog, license and package metadata.
Test installation from the tarball before release. Publish using npm Trusted
Publishing where available; CI gates are not themselves registry publication.
`npm run package:check` builds/packs/checks exact tarball paths, rejects links and
duplicates, validates UTF-8 and scans known credential patterns. This is an
additional control, not a guarantee that every possible secret is recognized.
Inspect contents privately and publish only through an authorized release.

[Documentation](https://usnuz.github.io/fragment-donor-sdk/en/)
· [Source](https://github.com/usnuz/fragment-donor-sdk/tree/main/typescript)
· [Issues](https://github.com/usnuz/fragment-donor-sdk/issues)
