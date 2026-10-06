# Fragment Donor SDK 0.1.0 — delivery and publication report

Snapshot: **2026-10-06**. Owner: `usnuz`. Independent project, not an official
Telegram, Fragment or TON product. Preparation, tests, source publication,
registry release, platform acceptance and search indexing are separate states.

## Current outcome and remote gate

Seven SDKs, multilingual docs, guarded contract exports and tailored publication
materials are implemented. The stable [v0.1.0 release](https://github.com/usnuz/fragment-donor-sdk/releases/tag/v0.1.0)
is public with nine downloadable assets from exact source commit
[`9e8a9f8577936a37ed750f55f6604e475a545ad9`](https://github.com/usnuz/fragment-donor-sdk/commit/9e8a9f8577936a37ed750f55f6604e475a545ad9).

The exact release source's [CI run 37345045005](https://github.com/usnuz/fragment-donor-sdk/actions/runs/37345045005)
passed all **14 runtime jobs**. [Release run 37345310643](https://github.com/usnuz/fragment-donor-sdk/actions/runs/37345310643)
also succeeded: validate + 14 reusable CI jobs + publication. An earlier run
correctly rejected an unsupported NuGet metadata filename; .NET 8 is pinned and
the exact known official forms now have ten positive/negative regressions.
Safe PHP/.NET README changes were included in the validated release source.

Root `v0.1.0` and Go `go/v0.1.0` point to that exact commit. A clean public
Go consumer fetched the version with no `replace`, verified standard sumdb
checksums and passed mocked functional/security checks. The [exact pkg.go.dev version](https://pkg.go.dev/github.com/usnuz/fragment-donor-sdk/go@v0.1.0)
returned HTTP 200 at **2026-10-05 17:20:07 UTC**. All nine release signatures
were checked in the actual release job before publication; independently
downloaded files then passed integrity, metadata and archive-content checks.

The [public Postman documentation](https://documenter.getpostman.com/view/24750404/2sBYHNYPn3)
is published and browser verified with the four safe examples and placeholder-only
environment. Social/community posts, Product Hunt and YouTube remain unpublished.
No backend deployment or real Stars/Premium purchase was performed.
Later evidence/media-only main-branch changes do not move the released tags.

PyPI access is now verified and a pending trusted publisher exists for
`usnuz/fragment-donor-sdk`, `registry-publish.yml`, environment `pypi/python`.
The owner-confirmed first publish run
[37364162843](https://github.com/usnuz/fragment-donor-sdk/actions/runs/37364162843)
failed before validation: GitHub Actions did not acquire a hosted runner after
multiple attempts during a reported service incident. The Python job was skipped,
the public package remained absent, and no duplicate dispatch was sent.

After the incident resolved, the owner explicitly confirmed one replacement.
[Run 37404248538](https://github.com/usnuz/fragment-donor-sdk/actions/runs/37404248538)
passed validation and Python publication while every other ecosystem was skipped.
[PyPI 0.1.0](https://pypi.org/project/fragment-donor-sdk/0.1.0/) exposes the wheel
and sdist with Trusted Publishing provenance bound to GitHub Actions, this repository,
workflow and commit `2e364d03d3e72fcbd63518e673e7b28032a8433b`.
A clean Python 3.12 environment installed the exact version using only public
PyPI with cache disabled; import, metadata and installed mocked-HTTP smoke passed.

[npm 0.1.0](https://www.npmjs.com/package/fragment-donor-sdk/v/0.1.0) was
bootstrapped under owner `shohzodbek` after enabling account 2FA with a security
key. The upload used the exact reviewed tarball with SHA256
`9b6a61139297a05ba391b2195de38f7c0b0c7458ae50003f802d989ddd50ff3f`.
Public registry metadata and a clean install followed by the installed mocked-HTTP
smoke passed. The package now trusts GitHub Actions for
`usnuz/fragment-donor-sdk`, `registry-publish.yml`, environment `npm`, permitting
`npm publish` but not `npm dist-tag`. Because the first release was a direct
authenticated bootstrap upload, it has registry signing but no GitHub OIDC
provenance; later versions should use the trusted publisher. Immutable 0.1.0
must not be published again.

[Packagist v0.1.0](https://packagist.org/packages/fragment-donor/sdk#v0.1.0)
was submitted from the public repository by GitHub-authenticated owner `usnuz`.
Packagist resolved the root Composer manifest to `fragment-donor/sdk` and indexed
the exact release commit `9e8a9f8577936a37ed750f55f6604e475a545ad9`.
Its public metadata reports PHP >=8.2, required cURL/JSON extensions, MIT and the
expected source/docs/issues links. A fresh public Composer install selected
v0.1.0 and the installed four-operation, uncertainty, decimal and credential-
redaction mocked smoke passed. Automatic GitHub updates are not configured.

The later main-branch [CI run 37366652572](https://github.com/usnuz/fragment-donor-sdk/actions/runs/37366652572)
also ended after 15 minutes during the same incident. Eight jobs produced normal
artifacts, while PHP 8.2/8.4, .NET, Go and Node 22/24 were not acquired by hosted
runners; GitHub also reported an internal server error. This is infrastructure
failure evidence, not a package-test failure. GitHub reported Actions operating
normally at 2026-10-05 21:54 UTC and resolved the incident at 22:49 UTC.

After recovery, [CI run 37403714196](https://github.com/usnuz/fragment-donor-sdk/actions/runs/37403714196)
passed all 14 jobs for commit `2e364d03d3e72fcbd63518e673e7b28032a8433b`.
[Pages run 37403793708](https://github.com/usnuz/fragment-donor-sdk/actions/runs/37403793708)
then passed build and deploy for that exact commit; the subsequent live check
again passed all 61 static pages plus demo/media, sitemap/robots, OpenAPI and Postman.

The [post-release delivery CI](https://github.com/usnuz/fragment-donor-sdk/actions/runs/37348979185)
also passed all 14 jobs at `e34ed219e453894b9a203b74418a6f5b05095fd2`;
[Pages run 37349102133](https://github.com/usnuz/fragment-donor-sdk/actions/runs/37349102133)
succeeded at that same commit. Its reviewed baseline JPEG was independently
fetched over HTTPS and matched all 117,338 original bytes/SHA256; metadata-only
evidence updates afterward do not change SDKs, released tags or screenshot bytes.

All eligible publication is authorized; access, publisher ownership and platform
rules still limit execution. This report does not claim the whole original plan
is complete.

## Verified public source, docs and contract exports

| Resource | Public location | Evidence boundary |
| --- | --- | --- |
| SDK-only source | [GitHub](https://github.com/usnuz/fragment-donor-sdk) | Source/release published; exact source linked above. No parent production history. |
| Docs | [Root](https://usnuz.github.io/fragment-donor-sdk/), [EN](https://usnuz.github.io/fragment-donor-sdk/en/), [RU](https://usnuz.github.io/fragment-donor-sdk/ru/), [UZ](https://usnuz.github.io/fragment-donor-sdk/uz/) | Pages run 37345175590 success at release commit; all 61 live pages independently verified again. |
| OpenAPI | [openapi.json](https://usnuz.github.io/fragment-donor-sdk/openapi.json) | Updated HTTP 200, four paths and explicit service no-auth verified. |
| Postman collection | [postman.json](https://usnuz.github.io/fragment-donor-sdk/postman.json) | Updated guarded collection verified; not a Postman API Network listing. |
| Postman environment | [Empty-secret environment](https://usnuz.github.io/fragment-donor-sdk/postman.environment.json) | Public HTTP 200 and blank sensitive values independently verified. |
| Synthetic demo | [Fixture viewer](https://usnuz.github.io/fragment-donor-sdk/demo/) | Public static demo/trust boundary plus PNG/MP4 HTTP 200 verified. |
| Actual video | [50-second MP4](https://usnuz.github.io/fragment-donor-sdk/demo/media/walkthrough-en.mp4) | Silent rendered synthetic walkthrough, not real payment footage or a YouTube upload. |
| Actual screenshot | [Earlier UZ baseline JPEG](https://usnuz.github.io/fragment-donor-sdk/demo/media/docs-uz-baseline.jpg) | HTTP200 and exact original bytes/SHA256 verified; not newly captured current UI or payment evidence. |
| Go index | [pkg.go.dev 0.1.0](https://pkg.go.dev/github.com/usnuz/fragment-donor-sdk/go@v0.1.0) | Version and public install verified; unrelated to Google/Bing indexing. |
| Sitemap | [sitemap.xml](https://usnuz.github.io/fragment-donor-sdk/sitemap.xml) | Hosting is not webmaster submission/indexing. |

The fresh live route check at **2026-10-05 17:19 UTC** covered all 61 static
pages and the guarded environment/demo/media, contract exports, sitemap/robots,
language/canonical/hreflang and absence of executable JavaScript. The browser
layout screenshot was captured earlier and is not new UI proof. Live checks
were read-only and used the configured system proxy; no login workaround.

## Packages and conditional install commands

All versions: **0.1.0**. The **Go command works now**. The other six registry
commands remain conditional: use them only after the exact registry version is
published and freshly installed. Reviewed [GitHub release archives](https://github.com/usnuz/fragment-donor-sdk/releases/tag/v0.1.0)
are available now and separately consumer-tested; names are not reservations.

| Runtime | Package | After verified publication |
| --- | --- | --- |
| Python 3.10+ | `fragment-donor-sdk` | `python -m pip install fragment-donor-sdk==0.1.0` |
| Node 20+ / TypeScript | `fragment-donor-sdk` | `npm install fragment-donor-sdk@0.1.0` |
| PHP 8.2+ + cURL | `fragment-donor/sdk` | `composer require fragment-donor/sdk:0.1.0` |
| .NET 8+ | `FragmentDonor.Sdk` | `dotnet add package FragmentDonor.Sdk --version 0.1.0` |
| Go 1.23+ | `github.com/usnuz/fragment-donor-sdk/go` | `go get github.com/usnuz/fragment-donor-sdk/go@v0.1.0` |
| Rust 1.99+ | `fragment-donor-sdk` | `cargo add fragment-donor-sdk@0.1.0` |
| Ruby 3.2+ | `fragment-donor-sdk` | `gem install fragment-donor-sdk -v 0.1.0` |

Go's required **`go/v0.1.0`** exists, not only a root tag. Its standard module
checksum is `h1:IC7mNlqI7N7I4ZLGQJW6e2TU8liwOzMpvrCW+FFKHlY=`.
npm's publisher
minimum Node 22.14/npm 11.5.1 is separate from SDK Node 20 support.

## Local native checks

| SDK | Native runtime | Local result |
| --- | --- | --- |
| Python | Python 3.12 | PASS: **27 tests**, warnings-as-errors, Ruff and strict mypy. Local `python -m build` was **NOT_RUN** in this audit because the `build` module was absent; the downloaded release wheel/sdist and their clean installed consumer smoke were verified separately. |
| Node/TypeScript | Node 24.18.0 | PASS: **26 tests**, strict build/declarations, format, tarball checks and installed smoke. |
| PHP | PHP 8.2.34 | PASS: **13 groups**, syntax/PSR-12, Composer, exact standalone/root archives and fresh functional/redaction smoke. |
| .NET | SDK 8.0.425 | PASS: **13 groups**, format/build/installed smoke/example and **10 package-security regressions**. Fixed remote gate passed.
| Go | Go 1.26 | PASS: **67 tests/subcases** (11 top-level), test/vet/build/format and fresh source-archive consumer. Local race NOT_RUN without GCC; Linux CI race gate required. |
| Rust | Rust 1.99 | PASS: **10 tests**, locked build/test, format, strict clippy, eight-file crate and extracted consumer. |
| Ruby | Ruby 4.0.7 | PASS: **12 tests / 379 assertions**, syntax/format, four-file gem and installed consumer. |

Groups, subcases and assertions are different suite metrics, not an aggregate
test count. Synthetic credentials and mocked/local transports establish client
behavior, not successful blockchain delivery or production wallet safety.

Other local checks: 61 static pages, five demo tests, 24 content assets with
133 local/generated-site links and six link-parser regressions, 12 archive-security and 14 release-helper
tests. Source review allowlisted 178 files, excluding caches, downloads, artifacts and production
history. Known-pattern secret scans are defense in depth, not proof of absolute
secrecy.

Reachable public history at `5cb25b7edd5092f554742cd5f1e8ff20562f7cf7`
was separately rescanned: **11 commits, 460 objects, 314 blobs, 218 distinct paths**,
4,103,994 reachable object bytes. Five known credential patterns and historical
symlink/gitlink, production `.env`/database/runtime/build/unapproved-root checks
had zero findings. The single initial root contained only an allowlisted file;
no parent-backend history was imported. This covers local reachable refs and
known patterns, not arbitrary secrets, unreachable objects or external storage.

Five native SVG/PNG 1920×1080 frames and an actual **50-second silent H.264
synthetic video**, English captions/subtitles, are prepared. They are rendered
diagrams, not screencast/live transaction footage/human narration or a YouTube
upload. A separate, unchanged **1265×712 existing UZ docs screenshot** is included
and hash-bound; it predates the current demo/footer, exact capture time is unknown,
and it is not a newly captured current UI or payment proof.
[Actual media pack](content/10-product-hunt.md). The CSS-only viewer makes
no JavaScript/API request, accepts no secrets and invents no dispatch counter.

## Fresh consumers of the actual public release

Downloaded packages, not substituted local builds, were used in clean consumers.
Python wheel (offline) and sdist (isolated public build dependencies), npm tarball
(offline, scripts disabled), PHP ZIP (offline Composer), .NET NUPKG (local feed)
and Ruby gem (isolated local gem home) passed their functional/security smoke.
Go fetched the public version with no local replacement and verified sumdb.
The actual Rust crate passed exact eight-file contents checks and a fresh offline
Rust 1.99 consumer build with 121 cached dependencies, then four mocked operations,
unknown-outcome, decimal/extras, redaction and no-duplicate checks. Initial local
dlltool setup errors were resolved with existing LLVM flags, without installing
a new toolchain. **All seven actual public release/module consumers passed**;
the final four-language evidence was recorded at **2026-10-05 17:27:10 UTC**.
Each smoke uses mocked transport, not paid production operations. This is
post-download release verification, not proof of six-registry publication.

## Executed provenance/release gates

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
is **not signed provenance**. The [actual attestation](https://github.com/usnuz/fragment-donor-sdk/attestations/52907139)
was generated and the release job verified each signature against the pinned
workflow, release ref and exact source digest. Downloaded assets were separately
verified against public release digests, `SHA256SUMS`, canonical provenance,
successful owned Actions run and both tags. The signing evidence is the actual
successful release-job step, not a newly invented local cryptographic verifier.
No SLSA Level 3 or owner-immutable GitHub release-setting claim is made.
Exact account/environment fields: [runbook](PUBLISHING_RUNBOOK.md#owner-setup-fields).

Optional GitHub topic metadata update returned **HTTP 403**. Public topics are
currently empty, despite the otherwise green release job. Owner metadata access
is needed; source/release publication does not prove topics were set.

## All 45 platform states

Copied from [publication-status.json](publication-status.json) at this snapshot:
**15 PUBLISHED, 1 SUBMITTED, 0 BLOCKED_ACCESS, 0 READY, 8 NOT_ELIGIBLE, 21 NOT_RUN**. READY materials do
not mean publication. GitHub/Pages, PyPI, npm, Packagist, NuGet, crates.io,
RubyGems and Go module/index are verified.

| # | Platform | Actual state |
| --- | --- | --- |
| 1 | GitHub | PUBLISHED |
| 2 | GitHub Pages | PUBLISHED |
| 3 | GitLab | PUBLISHED |
| 4 | ReadTheDocs | PUBLISHED |
| 5 | SourceForge | PUBLISHED |
| 6 | PyPI | PUBLISHED |
| 7 | npm | PUBLISHED |
| 8 | Packagist | PUBLISHED |
| 9 | NuGet | PUBLISHED |
| 10 | Go/pkg.go.dev | PUBLISHED |
| 11 | crates.io | PUBLISHED |
| 12 | RubyGems | PUBLISHED |
| 13 | Postman API Network | PUBLISHED |
| 14 | Swagger Studio | PUBLISHED |
| 15 | APIs.guru | SUBMITTED ([issue #3556](https://github.com/APIs-guru/openapi-directory/issues/3556)) |
| 16 | RapidAPI | NOT_RUN |
| 17 | TON App | NOT_RUN |
| 18 | DEV.to | NOT_ELIGIBLE |
| 19 | Hashnode | PUBLISHED ([public article](https://fragment-donor-sdk.hashnode.dev/a-server-only-telegram-stars-sdk-transport-and-trust-boundaries)) |
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

PyPI, npm, Packagist, NuGet, crates.io and RubyGems are **PUBLISHED** and
public-install or download verified. Postman is **PUBLISHED** with a public
four-operation collection, masked secrets and a placeholder-only environment;
no API request or purchase was executed. The [GitLab mirror](https://gitlab.com/fragment-donor-sdk/fragment-donor-sdk-mirror)
is a public verified snapshot at commit `d5278d0` with both tags. [Read the Docs](https://fragment-donor-sdk.readthedocs.io/en/latest/)
is also public with a successful custom build and HTTP-200 EN/RU/UZ paths. The [SourceForge project](https://sourceforge.net/projects/fragment-donor-sdk/)
publishes a verified source/download mirror with MIT metadata and all nine v0.1.0 assets. [Swagger Studio](https://app.swaggerhub.com/apis/independent-7a3/fragment-donor-sdk/0.1.0)
publishes the public credential-free OpenAPI 0.1.0 schema and returned HTTP 200. Use normal login/2FA for remaining
[manual actions](manual-actions.md); never put secrets in chat.

[Hashnode](https://fragment-donor-sdk.hashnode.dev/a-server-only-telegram-stars-sdk-transport-and-trust-boundaries)
now publishes the owner-reviewed AI-assisted security article with an explicit disclosure; its public URL returned
HTTP 200. DEV.to was not submitted because the current generated promotional article is not eligible under its AI policy.

APIs.guru review is pending in [issue #3556](https://github.com/APIs-guru/openapi-directory/issues/3556).
The owner authorized CC0 distribution for that directory submission. It remains **SUBMITTED**, not PUBLISHED,
until maintainers accept it and the public catalog entry is verified.

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

Next gates: complete human login/2FA for the remaining registries, configure their exact
owner/publisher environments and topic metadata, then execute accessible
eligible registry/platform actions. Reopen every actual registry version/post
and perform fresh registry installs before updating PUBLISHED. Google/Bing/Yandex
ownership and indexing remain independent owner tasks.
