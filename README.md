# Fragment Donor SDKs

Independent client libraries for `https://fragment.donor.uz`, a service for
Telegram Stars and Premium integrations. Not an official Telegram, Fragment,
or TON product.

The direct API requires no account, service API key, `Authorization`, or
`X-Api-Key`. Purchase operations use your own Fragment cookie and wallet
mnemonic. The optional `Api-Key` header is a TonConsole provider key only.

All four endpoints share one per-IP minute window, normally 30 requests/minute.
Respect HTTP 429 `FLOOD_WAIT` / `Retry-After` and HTTP 503 retry hints.
Purchases are never retried automatically: a timeout may follow a successful
payment. There is no backend idempotency-key guarantee.

Seven packages are maintained here: Python, Node.js/TypeScript, PHP, .NET,
Go, Rust, and Ruby. See [the SDK guide](docs/SDK_GUIDE.md) and
[publishing status](publishing/publication-status.json).

This directory contains independently authored public SDK material. Never
publish the parent production repository or its Git history.

## Credential handling

Use a dedicated, minimally funded wallet and server-side secret storage.
Node.js purchase code is server-only; do not expose mnemonics in browser code,
localStorage, screenshots, examples, or logs.

SDK redaction does not make the backend a non-custodial or zero-retention
service: the inspected backend records submitted wallet credentials in its
database. Treat the operator as having access to the submitted credentials.
Documentation must not claim that the server never stores them.

## Release state

Initial version: `0.1.0`. Package names and registry ownership are provisional
until availability and publisher access are verified. A prepared package is
not necessarily published; status reports distinguish those states.
