# Fragment Donor SDK integration guide

Version: 0.1.0. Independent SDK project, not an official Telegram, Fragment, or
TON product. Package names are not reservations; consult the
[publication status](../publishing/publication-status.json) before using registry
commands. Source, installed artifact, registry release, and search indexing are
separate states.

## Contract

Base URL: `https://fragment.donor.uz`. There is **no service authentication**:
never send `Authorization`, `X-Api-Key`, or invent a service token. The optional
`Api-Key` header is a **TonConsole provider key**, not service authentication.

| Operation | Method/path | Inputs | Wallet credentials |
| --- | --- | --- | --- |
| User lookup | GET `/get-user-info/` | query `username` | None |
| Stars gift | POST `/buy-stars/` | form `username`, `amount`, `payment_method` | Mnemonic + Fragment Cookie |
| Premium gift | POST `/buy-premium/` | form `username`, `duration`, `payment_method` | Mnemonic + Fragment Cookie |
| Balance | GET or POST `/wallet-balance/` | no form required | Mnemonic |

Username syntax: optional `@`, an ASCII letter, then 3–31 ASCII letters, digits,
or underscores. Stars: integer 50–1,000,000. Premium: integer 3, 6, or 12 months.
Payment: `usdt_ton` (default) or `ton`. Wallet versions: `auto`, `v5r1`, `v4r2`,
`v3r2`. Mnemonics contain 12, 18, or 24 words. Client word-count checks are not
proof of a valid funded wallet. Optional headers: `Wallet-Address`, `Proxy`,
`User-Agent`, and provider `Api-Key`.

Successful lookup models expose username/Premium status, purchases preserve the
upstream `data`, and balances preserve exact decimal **strings**. Unknown fields
are retained in the language-specific raw/extra response property.

## Install and examples

| Runtime | Registry command after publication | Tested source/examples |
| --- | --- | --- |
| Python 3.10+ | `pip install fragment-donor-sdk==0.1.0` | [Python](../python/README.md), [four operations](../python/examples/all_endpoints.py) |
| Node.js 20+ / TypeScript | `npm install fragment-donor-sdk@0.1.0` | [TypeScript](../typescript/README.md), [four operations](../typescript/examples/all-endpoints.mjs) |
| PHP 8.2+ with cURL | `composer require fragment-donor/sdk:^0.1` | [PHP](../php/README.md), [example](../php/examples/quickstart.php) |
| .NET 8+ | `dotnet add package FragmentDonor.Sdk --version 0.1.0` | [.NET](../dotnet/README.md), [example](../dotnet/examples/QuickStart/Program.cs) |
| Go 1.23+ | `go get github.com/usnuz/fragment-donor-sdk/go@v0.1.0` | [Go](../go/README.md) |
| Rust 1.99+ | `cargo add fragment-donor-sdk@0.1.0` | [Rust](../rust/README.md) |
| Ruby 3.2+ | `gem install fragment-donor-sdk -v 0.1.0` | [Ruby](../ruby/README.md) |

Use the backend language you already deploy. Python and Node.js examples have
explicit environment opt-in before any purchase; do not enable it in CI. Node.js
is server-side, not a browser wallet: browser Cookie restrictions and mnemonic
exposure make purchase code unsuitable for a frontend.

## Errors, flood wait, and ambiguous outcomes

The default quota is shared across four endpoints: **30 requests/IP/minute**.
HTTP 429 returns `FLOOD_WAIT`, `retry_after`, `flood_wait`, and `Retry-After`.
HTTP 503 `RATE_LIMIT_UNAVAILABLE` fails closed with a 5-second wait hint.
Error details may appear in `error`, `reason`, or `info`. Each SDK supplies typed
validation, API, flood-wait, service-unavailable, transport, timeout, and malformed
response errors, retaining safe-redacted structured details.

Default automatic retries: zero. Read-only retry is opt-in, bounded to at most
two retries and 60 seconds per wait; automatic 429 waits require explicit opt-in.
Purchases **never retry**, including 429, 503, transport failures, timeouts, or
5xx. No backend idempotency-key or purchase-status endpoint is available. A
timeout does not establish whether funds were spent. Check wallet transaction
history and recipient state, keep the upstream transaction hash if supplied,
and reconcile manually before intentionally issuing another purchase.

## Secret handling and trust boundary

Wallet mnemonics, Fragment session cookies, proxy credentials, and provider keys
are secrets. Keep them in a server-side secret manager or environment, never in
URLs, screenshots, source control, browser storage, exception logs, or public
request examples. SDK-owned transports disable redirects, preventing credential
forwarding to a redirected host. Custom transports must enforce this themselves
and must not retry purchases or log sensitive headers.

**The inspected backend persists submitted purchase credentials in its database.**
SDK redaction cannot remove server-side retention or restrict operator access.
Do not describe the service as non-custodial, zero-retention, or risk-free. Use a
dedicated minimally funded wallet and evaluate the operator trust boundary.

All tests use synthetic fixtures and mocked/local transports. They prove SDK
behavior, not a successful blockchain purchase or production wallet safety.
No real payment is needed for tests, packaging, documentation, or publication.

## Multilingual documentation

Primary site: `https://usnuz.github.io/fragment-donor-sdk/`, separate `/en/`,
`/ru/`, `/uz/` paths. Every topic is statically rendered with a self-canonical,
reciprocal same-topic hreflang links, English x-default, and sitemap entry.
There are no automatic language redirects. Switching language preserves topic.
Search Console/Bing submission requires account/property access; technical SEO
checks do not guarantee indexing, rankings, or appearance in any language.

Build: `node contract/build.mjs`, `node docs/build.mjs`, `node docs/test.mjs`.
Package-specific commands and native examples live in the linked READMEs.
