# Repository, documentation and API-directory payloads

Prepared 2026-10-05 with AI assistance. READY payloads are not live listings.
All eligible external publication is authorized; account access, platform policy,
editorial review, paid plans and registry acceptance are not assumed. Six
registry sites and Postman have saved browser permission blocks; no publication
on them is verified. Other unvisited channels remain NOT_RUN.
Use the [matrix](../PLATFORM_MATRIX.md) and [runbook](../PUBLISHING_RUNBOOK.md).

Shared links: source https://github.com/usnuz/fragment-donor-sdk;
docs https://usnuz.github.io/fragment-donor-sdk/en/ (also `/ru/`, `/uz/`).
Every platform must retain independent-project and backend-retention disclosures.
No invented exact listing URL or reviewer acceptance is supplied.

## GitHub

Title: Fragment Donor SDKs.
Repository description (copy):

> Independent server SDKs for Telegram Stars/Premium: Python, Node/TypeScript,
> PHP, .NET, Go, Rust and Ruby. Typed errors, safe no-retry purchases, EN/RU/UZ docs.

Topics: `telegram-stars`, `telegram-premium`, `sdk`, `ton`, `python`, `typescript`,
`php`, `dotnet`, `golang`, `rust`, `ruby` (select platform-supported limit).
Website field: primary docs. README is authoritative for retention/limitations.

Release note copy, **only after all declared artifacts exist and pass**:

> Initial 0.1.0 SDK source release for four Fragment Donor endpoints. Includes
> form-urlencoded purchases, decimal balance strings, future response fields,
> typed errors, opt-in bounded read retries and no automatic purchase retry.
> Tests use synthetic fixtures/mocked transport; no wallet funds were spent.
> Not official Telegram/Fragment/TON software. Backend stores submitted
> credentials; SDK redaction does not imply non-custodial or zero-retention service.
> Source release, registry publication and search indexing are separate states.
> Consult publication-status.json for each package and channel.

Use a reviewed source-only clean commit/history and independently scanned release
artifacts, not a ZIP of the parent backend directory. No claim of security audit
certification. Obtain actual public release URL only after publication.

## GitHub Pages

Page title: Fragment Donor SDK documentation — English, Русский, O‘zbekcha.
Description (copy):

> Static four-endpoint documentation, seven runtime guides, 429/Retry-After
> handling and credential-retention limitations for the independent Fragment
> Donor API. No wallet-secret forms or payment processing are hosted here.

Build source: `docs/build.mjs`; contracts: `contract/build.mjs`; checks:
`docs/test.mjs`. Self-canonical and same-topic alternate languages remain intact.
Pages is the primary indexed docs host, not a storefront/SaaS transaction service.

## GitLab

Title: Fragment Donor SDK mirror.
Description (copy):

> Public mirror of independent MIT-licensed SDK sources for Fragment Donor.
> Canonical development, issues, releases and EN/RU/UZ docs are linked from
> https://github.com/usnuz/fragment-donor-sdk. No production backend history.
> This is not official Telegram, Fragment or TON software. Wallet operations
> submit sensitive credentials to a backend that stores them; read the security
> boundary before integrating. A mirror is not a registry release.

Tags: `sdk`, `telegram`, `ton`, `api`. Create a genuine clean Git mirror and keep
its README pointing to GitHub. Use normal owner-authorized Git push or a supported
free push mirror; no paid pull-mirror upgrade. Inspect branch/tag parity before
calling it a mirror. GitLab account access/publication is NOT_RUN.

## Read the Docs

Project title: Fragment Donor SDK documentation.
Description (copy):

> Open-source SDK reference for an independent Telegram Stars/Premium API.
> Canonical primary docs: https://usnuz.github.io/fragment-donor-sdk/.
> EN/RU/UZ contract and security guides; no payment-secret collection forms.

RTD import/build is NOT_RUN: this custom static build has no verified RTD config.
Before import, configure a supported build, verify current community eligibility,
and select a secondary redirect/noindex/canonical approach rather than duplicating
all indexed pages. Do not falsely claim an RTD URL exists. Do not subscribe to
commercial hosting or remove free-hosting attribution/ads without authorization.

## SourceForge

Project title: Fragment Donor SDK.
Suggested slug: `fragment-donor-sdk` (availability not a reservation).
Categories: Libraries / Software Development; supported language categories.
Short description (copy):

> Independent MIT server libraries for a Telegram Stars/Premium API, with seven
> runtimes, exact balance strings, mocked contract tests and EN/RU/UZ docs.

Long description (copy):

> SDK sources are open under MIT; the private production backend and its history
> are not part of this project. Username lookup, wallet balance and intended
> Stars/Premium gifting use a form-urlencoded contract. No service login/key is
> needed, but wallet operations use sensitive credentials, and the inspected
> backend records submitted purchase credentials. Purchases never retry
> automatically; there is no idempotency guarantee. Not an official Telegram,
> Fragment or TON product. Source/docs link to the canonical GitHub project.

Create only an eligible open-source SDK project, attach actual reviewed released
archives with checksums, and reopen download URLs. No CLI is invented; current
project is SDK libraries. Account/create/download actions are NOT_RUN.

## Postman API Network

Collection/workspace title: Fragment Donor API — synthetic examples.
Description (copy):

> Four operations for the independent Fragment Donor service: username lookup,
> wallet balance, Stars gifting and Premium gifting. Direct service auth is none;
> optional Api-Key is TonConsole provider configuration. Purchases need Mnemonic
> and Fragment Cookie, and the backend stores submitted credentials. This public
> collection contains placeholder-only variables and synthetic responses; do
> not run a purchase or share real secrets. Purchases are non-retrying and have
> no idempotency guarantee. Docs: https://usnuz.github.io/fragment-donor-sdk/en/.

Tags: `telegram-stars`, `telegram-premium`, `ton`, `sdk`, `api`.
Run `node contract/build.mjs` then `node docs/build.mjs`. Import the separate
`site/postman.json` collection and `site/postman.environment.json` environment;
review their actual generated files. Saved responses label success/429/503 and
purchase HTTP 400 `unconfirmed:true`/`tx_hash` as synthetic. That 400 means an
unknown payment outcome, not ordinary rejected validation; preserve the safe
reference and reconcile rather than retry. Keep wallet/provider values empty
and `allow_real_purchases=false`; inspect collection/local/current/shared values,
select `No Auth`, publish an authorized public workspace and reopen it logged out.
Do not supply `Authorization`/`X-Api-Key` or enter real mnemonic/cookie values.
Public collection publication is BLOCKED_ACCESS by saved browser permission,
not submitted. A generated collection/environment is not a public Network listing.

## Swagger Studio

API title: Fragment Donor API.
Version: 0.1.0. Tags: Telegram Stars, Premium, Wallet, SDK.
Description (copy):

> Independent four-operation API at https://fragment.donor.uz. No service login,
> account or service key. Cookie/Mnemonic are sensitive purchase credentials;
> optional Api-Key is a TonConsole provider key, not a service security scheme.
> Backend stores submitted credentials. Form-urlencoded purchases are never
> auto-retried; no idempotency guarantee. All public examples are synthetic.
> Source: https://github.com/usnuz/fragment-donor-sdk.

Import generated `site/openapi.json`, check `security: []` and no invented
service security scheme. Verify all four operations/form fields/decimal strings
and runtime constraints against the contract. Make public only under owner role,
then separately publish the stable version. Public visibility ≠ published version.
No paid upgrade or listing action was performed.

## APIs.guru

Status: SUBMITTED in [APIs.guru issue #3556](https://github.com/APIs-guru/openapi-directory/issues/3556); directory acceptance pending.
Human contributor facts, not an automatically submitted claim:

- API provider domain: `fragment.donor.uz`; title Fragment Donor API; version0.1.0.
- Schema source: generated OpenAPI; documentation and clean SDK source as above.
- Direct no-service-auth contract, four operations, synthetic examples; sensitive
  wallet headers and backend retention described openly.
- SDK source uses MIT. The owner explicitly authorized APIs.guru to distribute the
  submitted definition under CC0 1.0; the stable GitHub Pages schema URL was submitted.
- Do not claim this is a decentralized wallet or an official Fragment API.
- Actual directory approval remains separate from submission; do not mark PUBLISHED
  until the accepted catalog entry is reopened and verified.

## RapidAPI

Status: NOT_RUN — gateway/security/fee review required, no active plan/listing.
Technical listing title: Fragment Donor API.
Draft description (copy **only after gateway review**):

> Independent Telegram Stars/Premium integration API with username and balance
> reads. Direct API access is service-authless. A RapidAPI gateway route, if
> enabled, has RapidAPI's separate platform key/subscription requirements;
> those do not apply to the direct SDK base URL. Wallet operations use sensitive
> credentials and the backend stores them. Passing seeds through a gateway
> adds another intermediary; review credential forwarding, logs and retention
> before enabling those operations. No idempotency guarantee or automatic
> purchase retry. No fee/plan value is claimed in this draft.

Verify whether this gateway can safely handle these headers and requests. If not,
do not list wallet operations there. Do not add service authentication to the
direct backend to satisfy the marketplace, silently change SDK defaults, enable
paid subscriptions, make real purchases or imply a gateway listing is approved.

## TON App

Status: READY descriptive draft, NOT_RUN category/eligibility/submission.
Category candidate: Developer tools / SDK (if current catalog supports it).
Name: Fragment Donor SDK.
Description (copy):

> Independent server SDKs for a TON-related Telegram Stars/Premium service.
> Python, Node/TypeScript, PHP, .NET, Go, Rust and Ruby; mocked contract tests,
> exact balance strings, 429/Retry-After handling and EN/RU/UZ documentation.
> Not official TON/Telegram/Fragment software and not a decentralized wallet.
> Backend stores submitted credentials; SDK redaction does not remove retention.
> Purchases never automatically retry, and no idempotency guarantee exists.
> Docs: https://usnuz.github.io/fragment-donor-sdk/en/.
> Source: https://github.com/usnuz/fragment-donor-sdk.

Check actual submit form and catalog eligibility before choosing a category;
provide truthful trust-model disclosures. No ecosystem endorsement badge,
decentralization claim, paid placement or approval is invented.
