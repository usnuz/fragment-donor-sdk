# Fragment Donor SDK integration guide

Version: 0.1.0. Independent SDK project, not an official Telegram, Fragment, or
TON product. Package names are not reservations; consult the
[publication status](../publishing/publication-status.json) before using registry
commands. Source, installed artifact, registry release, and search indexing are
separate states.

Verified delivery: [GitHub v0.1.0 release](https://github.com/usnuz/fragment-donor-sdk/releases/tag/v0.1.0)
contains reviewed downloadable packages. The [Go 0.1.0 index](https://pkg.go.dev/github.com/usnuz/fragment-donor-sdk/go@v0.1.0)
and `go get github.com/usnuz/fragment-donor-sdk/go@v0.1.0` are verified public.
PyPI `fragment-donor-sdk==0.1.0` is published through Trusted Publishing and was
verified by a clean public-index install, import and mocked HTTP smoke test.
npm `fragment-donor-sdk@0.1.0` is also public and was verified by a clean
registry install and mocked HTTP smoke test. Packagist `fragment-donor/sdk`
v0.1.0 is public and passed a clean Composer install plus mocked smoke. NuGet
`FragmentDonor.Sdk` 0.1.0 is public and passed a clean public-feed restore plus
mocked smoke. crates.io `fragment-donor-sdk` 0.1.0 is public from the exact
release commit and registry-download verified. RubyGems `fragment-donor-sdk`
0.1.0 is public through GitHub Trusted Publishing and its registry download
matches the signed GitHub release asset. A GitHub artifact install is not a
registry install.

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
Lookup checks the upstream recipient resolution, not a universal Telegram user
directory. A syntactically valid or publicly known username may still receive
`ok: false, reason: "Not a user"` from the service. Handle this API error rather
than assuming every sample username is gift-eligible.
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
explicit environment opt-in (`FRAGMENT_ALLOW_PURCHASES=yes`) and a single
`FRAGMENT_PURCHASE_KIND=stars` or `premium` before any purchase; do not enable
these flags in CI. PHP/.NET executable examples use the same safeguards. Node.js
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
and reconcile manually before intentionally issuing another purchase. The
backend can also return **HTTP 400** with `ok:false`, `unconfirmed:true` and a
`tx_hash` after dispatch. This is an **unknown payment outcome**, not ordinary
validation/rejection and not proof that no funds were spent. Keep safe-redacted
details and the transaction hash for reconciliation; do not blindly resend.
Purchase uncertainty is distinct from the HTTP status/error message. SDK
error properties document that distinction in each package README.

Generated Postman imports are separate `site/postman.json` and
`site/postman.environment.json` after the build below. Their saved responses are
synthetic success/429/503 and purchase-unconfirmed-400 examples. Keep mnemonic,
cookie and provider values empty and `allow_real_purchases=false`; never run a
real purchase to test documentation or a directory listing.

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
reciprocal same-topic hreflang links and a sitemap entry. x-default points to the
root language chooser for homepages and to the English version for topic pages.
There are no automatic language redirects. Switching language preserves topic.
Search Console/Bing/Yandex submission requires account/property access; technical SEO
checks do not guarantee indexing, rankings, or appearance in any language.
Google's project URL-prefix is not `github.io` DNS ownership. Yandex may require
the origin-root property: project repository access alone cannot verify or edit
`https://usnuz.github.io/`. Follow the actual issued ownership method and the
[webmaster runbook](../publishing/PUBLISHING_RUNBOOK.md#search-submission-and-verification).

## Publication workflow and actual availability

Eligible external publication is authorized. PyPI, npm, Packagist, NuGet,
crates.io and RubyGems 0.1.0 are verified; PyPI/npm/NuGet/crates.io/RubyGems trusted
publishers are configured. [Postman documentation](https://documenter.getpostman.com/view/24750404/2sBYHNYPn3)
is publicly verified with a placeholder-only environment. A public
[GitLab mirror](https://gitlab.com/fragment-donor-sdk/fragment-donor-sdk-mirror)
is a verified public snapshot with both release tags; GitHub remains authoritative. The secondary
[Read the Docs build](https://fragment-donor-sdk.readthedocs.io/en/latest/) is public with EN/RU/UZ paths. A
[SourceForge source/download mirror](https://sourceforge.net/projects/fragment-donor-sdk/) exposes the reviewed release assets.
Prepared release workflows do not
prove publication: [release.yml](../.github/workflows/release.yml) builds tested
GitHub assets and the Go submodule tag; [registry-publish.yml](../.github/workflows/registry-publish.yml)
requires explicit manual confirmation for one configured publisher/environment
at a time. Check [status evidence](../publishing/publication-status.json) before
using registry installation commands. Publisher ownership, 2FA/OIDC, Packagist's
initial repository submission and any first-crate bootstrap remain owner-access
steps; see [manual actions](../publishing/manual-actions.md).

A locally generated fixture viewer `site/demo/index.html` ([source generator](../demo/build.mjs)) uses CSS controls
to display synthetic responses for all four operations. It makes no API calls,
executes no JavaScript, accepts no wallet secrets and invents no dispatch counter.
The intended public route is `/demo/`; confirm actual deployment separately.
The [gallery/video pack](../publishing/content/10-product-hunt.md) includes five
rendered frames and a 50-second silent captioned video, not a live transaction
or screencast. Local assets are not evidence of a Product Hunt/YouTube listing.

Build: `node contract/build.mjs`, `node docs/build.mjs`, `node docs/test.mjs`.
Package-specific commands and native examples live in the linked READMEs.
