# Fragment Donor SDK 0.1.0 — delivery and publication report

Snapshot: **2026-10-05**. Owner: `usnuz`. Independent project, not an official
Telegram, Fragment or TON product. Preparation, tests, source publication,
registry release, platform acceptance and search indexing are separate states.

## Current outcome and remote gate

Seven SDKs and local artifacts, multilingual docs, guarded contract exports and
tailored publication materials are prepared. Source commit
[`77703896588540642b906233f957793d748fce41`](https://github.com/usnuz/fragment-donor-sdk/commit/77703896588540642b906233f957793d748fce41)
was pushed to the independent public SDK repository.

The new hardened [CI run 37341789648](https://github.com/usnuz/fragment-donor-sdk/actions/runs/37341789648)
has **no verified all-jobs success** at this snapshot. Its .NET tests and pack
passed, but [PackageCheck job 111870399139](https://github.com/usnuz/fragment-donor-sdk/actions/runs/37341789648/job/111870399139)
failed. Diagnosis/fix and a complete green run remain release gates. Local
results below do not replace remote verification.

Root `v0.1.0` is **not yet tagged/published**. Go `go/v0.1.0`, external
module-fetch/pkg.go.dev observation and release attestation verification are
pending. No registry, social, community, Product Hunt or YouTube publication is
verified. No backend deployment or real Stars/Premium purchase was performed.

All eligible publication is authorized; access, publisher ownership and platform
rules still limit execution. This report does not claim the whole original plan
is complete.

## Source/docs: verified baseline versus new update

| Resource | Public location | Evidence boundary |
| --- | --- | --- |
| SDK-only source | [GitHub](https://github.com/usnuz/fragment-donor-sdk) | Source published; new commit linked above. No parent production history. |
| Docs | [Root](https://usnuz.github.io/fragment-donor-sdk/), [EN](https://usnuz.github.io/fragment-donor-sdk/en/), [RU](https://usnuz.github.io/fragment-donor-sdk/ru/), [UZ](https://usnuz.github.io/fragment-donor-sdk/uz/) | Previous public baseline verified; newest deployment pending verification. |
| OpenAPI | [openapi.json](https://usnuz.github.io/fragment-donor-sdk/openapi.json) | Previous HTTP 200 baseline verified; updated contract not yet independently reopened. |
| Postman collection | [postman.json](https://usnuz.github.io/fragment-donor-sdk/postman.json) | Previous docs-hosted baseline verified; not a Postman API Network listing. |
| Postman environment | `https://usnuz.github.io/fragment-donor-sdk/postman.environment.json` | Newly generated separate empty-secret file; public update pending verification. |
| Synthetic demo | `https://usnuz.github.io/fragment-donor-sdk/demo/` | Locally generated CSS/radio fixture viewer; deployment pending verification. |
| Sitemap | [sitemap.xml](https://usnuz.github.io/fragment-donor-sdk/sitemap.xml) | Hosting is not webmaster submission/indexing. |

Previous baseline source `3acfe4a47f4af86d33e2c6e1618e90f5821c34f9` had
[CI 37305949417 success](https://github.com/usnuz/fragment-donor-sdk/actions/runs/37305949417).
Earlier live docs verification covered 61 static pages plus existing
OpenAPI/Postman/sitemap/robots files. That does not prove the new guarded
environment/demo/media or hardened release pipeline have been deployed.

## Packages and conditional install commands

All versions: **0.1.0**. Run these commands **only after the exact registry
version/tag is published and freshly installed**. Before that use reviewed source
or local artifacts; package names are not reservations.

| Runtime | Package | After verified publication |
| --- | --- | --- |
| Python 3.10+ | `fragment-donor-sdk` | `python -m pip install fragment-donor-sdk==0.1.0` |
| Node 20+ / TypeScript | `fragment-donor-sdk` | `npm install fragment-donor-sdk@0.1.0` |
| PHP 8.2+ + cURL | `fragment-donor/sdk` | `composer require fragment-donor/sdk:0.1.0` |
| .NET 8+ | `FragmentDonor.Sdk` | `dotnet add package FragmentDonor.Sdk --version 0.1.0` |
| Go 1.23+ | `github.com/usnuz/fragment-donor-sdk/go` | `go get github.com/usnuz/fragment-donor-sdk/go@v0.1.0` |
| Rust 1.99+ | `fragment-donor-sdk` | `cargo add fragment-donor-sdk@0.1.0` |
| Ruby 3.2+ | `fragment-donor-sdk` | `gem install fragment-donor-sdk -v 0.1.0` |

Go requires **`go/v0.1.0`**, not only a root release tag. npm's publisher
minimum Node 22.14/npm 11.5.1 is separate from SDK Node 20 support.

## Local native checks

| SDK | Native runtime | Local result |
| --- | --- | --- |
| Python | Python 3.12 | PASS: **27 tests**, warnings-as-errors, Ruff, strict mypy, wheel/sdist checks and installed smoke. |
| Node/TypeScript | Node 24.18.0 | PASS: **26 tests**, strict build/declarations, format, tarball checks and installed smoke. |
| PHP | PHP 8.2.34 | PASS: **13 groups**, syntax/PSR-12, Composer, exact standalone/root archives and fresh functional/redaction smoke. |
| .NET | SDK 8.0.425 | PASS locally: **13 groups**, format, zero-warning build, package checks and installed smoke/example. Remote PackageCheck failed; not remote PASS. |
| Go | Go 1.26 | PASS: **67 tests/subcases** (11 top-level), test/vet/build/format and fresh source-archive consumer. Local race NOT_RUN without GCC; Linux CI race gate required. |
| Rust | Rust 1.99 | PASS: **10 tests**, locked build/test, format, strict clippy, eight-file crate and extracted consumer. |
| Ruby | Ruby 4.0.7 | PASS: **12 tests / 379 assertions**, syntax/format, four-file gem and installed consumer. |

Groups, subcases and assertions are different suite metrics, not an aggregate
test count. Synthetic credentials and mocked/local transports establish client
behavior, not successful blockchain delivery or production wallet safety.

Other local checks: 61 static pages, five demo tests, 24 content assets/123 link
targets, 12 archive-security and 14 release-helper tests. Source review
allowlisted 173 files, excluding caches, downloads, artifacts and production
history. Known-pattern secret scans are defense in depth, not proof of absolute
secrecy.

Five native SVG/PNG 1920×1080 frames and an actual **50-second silent H.264
synthetic video**, English captions/subtitles, are prepared. They are rendered
diagrams, not screencast/live transaction footage/human narration or a YouTube
upload. [Actual media pack](content/10-product-hunt.md). The CSS-only viewer makes
no JavaScript/API request, accepts no secrets and invents no dispatch counter.

## Prepared provenance/release gates

[release.yml](../.github/workflows/release.yml) uses commit-pinned actions and
configured `actions/attest` v4 GitHub OIDC for nine exact assets: seven packages,
`release-provenance.json` and `SHA256SUMS`. Each signature is verified against
the exact source commit, release tag/ref and
`usnuz/fragment-donor-sdk/.github/workflows/release.yml` before release.

[registry-publish.yml](../.github/workflows/registry-publish.yml) requires manual
single-ecosystem selection and explicit confirmation. Its validation checks all
nine files, hashes/metadata, successful release-run identity, matching root/Go
tags and every signature before selected publication. Publisher ownership,
OIDC/2FA and first-package setup remain owner tasks. A checksum or unsigned JSON
is **not signed provenance**. No completed signing verification or SLSA Level 3
claim is made. Exact account/environment fields: [runbook](PUBLISHING_RUNBOOK.md#owner-setup-fields).

## All 45 platform states

Copied from [publication-status.json](publication-status.json) at this snapshot:
**2 PUBLISHED, 7 BLOCKED_ACCESS, 7 NOT_ELIGIBLE, 29 NOT_RUN**. READY materials do
not mean publication. GitHub/Pages baseline is published; new proof is pending.

| # | Platform | Actual state |
| --- | --- | --- |
| 1 | GitHub | PUBLISHED |
| 2 | GitHub Pages | PUBLISHED |
| 3 | GitLab | NOT_RUN |
| 4 | ReadTheDocs | NOT_RUN |
| 5 | SourceForge | NOT_RUN |
| 6 | PyPI | BLOCKED_ACCESS |
| 7 | npm | BLOCKED_ACCESS |
| 8 | Packagist | BLOCKED_ACCESS |
| 9 | NuGet | BLOCKED_ACCESS |
| 10 | Go/pkg.go.dev | NOT_RUN |
| 11 | crates.io | BLOCKED_ACCESS |
| 12 | RubyGems | BLOCKED_ACCESS |
| 13 | Postman API Network | BLOCKED_ACCESS |
| 14 | Swagger Studio | NOT_RUN |
| 15 | APIs.guru | NOT_RUN |
| 16 | RapidAPI | NOT_RUN |
| 17 | TON App | NOT_RUN |
| 18 | DEV.to | NOT_RUN |
| 19 | Hashnode | NOT_RUN |
| 20 | Medium | NOT_RUN |
| 21 | LinkedIn Articles | NOT_RUN |
| 22 | YouTube | NOT_RUN |
| 23 | IndieHackers | NOT_RUN |
| 24 | ProductHunt | NOT_RUN |
| 25 | vc.ru | NOT_ELIGIBLE |
| 26 | ru.stackoverflow | NOT_RUN |
| 27 | r/SideProject | NOT_RUN |
| 28 | r/TelegramBots | NOT_RUN |
| 29 | r/TONcoin | NOT_RUN |
| 30 | r/Python | NOT_RUN |
| 31 | r/node | NOT_RUN |
| 32 | r/django | NOT_RUN |
| 33 | TON developer EN | NOT_RUN |
| 34 | TON developer RU | NOT_RUN |
| 35 | Telegram developer communities | NOT_RUN |
| 36 | Discord developer communities | NOT_RUN |
| 37 | Google Search Console | NOT_RUN |
| 38 | Bing Webmaster Tools | NOT_RUN |
| 39 | Hacker News / Show HN | NOT_ELIGIBLE |
| 40 | Stack Overflow | NOT_ELIGIBLE |
| 41 | Habr | NOT_ELIGIBLE |
| 42 | HackerNoon | NOT_ELIGIBLE |
| 43 | r/SaaS | NOT_ELIGIBLE |
| 44 | r/webdev | NOT_ELIGIBLE |
| 45 | Yandex Webmaster | NOT_RUN |

## Remaining work and non-negotiable boundaries

Six registries plus Postman are **BLOCKED_ACCESS**: Chrome navigation was denied
by saved browser permission; owner login/publisher setup is unverified. No
alternate browser, extracted session or CLI authentication bypass was attempted.
Use normal login/2FA and [manual actions](manual-actions.md); never secrets in chat.

NOT_ELIGIBLE concerns the current generated/free promotional format. HN, English
Stack Overflow, Habr, HackerNoon and restricted subreddits must not receive
forbidden AI drafts; lightly rewriting is not a workaround. vc.ru's free
promotional route remains ineligible. Other destinations still require genuine
account/rule/editorial gates. No fake question, private outreach, vote
manipulation or paid plan is authorized. [Policy evidence](PLATFORM_MATRIX.md).

Google Search Console, Bing and Yandex verification/submission/indexing are
**NOT_RUN**. Project-path access does not grant `github.io` DNS or origin-root
ownership. SEO checks do not guarantee crawling, indexing or rankings.

**The inspected backend stores submitted purchase credentials.** No service
auth does not mean no wallet risk: purchases use Mnemonic + Fragment Cookie,
balance uses Mnemonic, optional `Api-Key` configures TonConsole. SDK redaction
does not erase retention or make this non-custodial/zero-retention.

Purchases never auto-retry. HTTP 400 `unconfirmed:true`/`tx_hash`, timeouts
or transport/malformed replies may be unknown payment outcome. Preserve safe
reconciliation details and examine wallet/recipient evidence before a new
intentional dispatch; no backend idempotency or purchase-status endpoint exists.

Next gates: fix remote PackageCheck, complete green hardened CI, verify actual
GitHub release/nine signatures/Go fetch and updated docs, then execute only
accessible eligible registry/platform actions. Update this snapshot and status
JSON with verified URLs/timestamps and fresh registry installs as proof arrives.
