# Fragment Donor SDKs

Independent client libraries for `https://fragment.donor.uz`, a service for
Telegram Stars and Premium integrations. Not an official Telegram, Fragment,
or TON product.

The direct API requires no account or service API key. Purchase operations use
your own Fragment cookie and wallet mnemonic. The optional `Api-Key` header is
a TonConsole provider key only.

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

Node.js purchase code is server-only; do not expose mnemonics in browser code,
localStorage, screenshots, examples, or logs.

Purchase requests transmit the wallet mnemonic and Fragment session/cookie to
the API operator. SDK redaction applies to client-side diagnostics only.

## Release state

Current stable version: `0.1.3`. The GitHub release and all seven SDK channels
(PyPI, npm, Packagist, NuGet, Go module, crates.io, and RubyGems) are verified
public. Published versions are immutable; consult the status report for exact
workflow, checksum, provenance, and consumer-test evidence.
