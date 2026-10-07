# Manual actions requiring owner access

## Current owner decisions

Chrome access is working. PyPI account `shohzodbek` and the untouched existing
`django-open-bot` project were verified. After the first incident-blocked run,
the owner explicitly confirmed one replacement. Run
[37404248538](https://github.com/usnuz/fragment-donor-sdk/actions/runs/37404248538)
published `fragment-donor-sdk==0.1.0` successfully through Trusted Publishing.
The public version, provenance, metadata, clean install/import and mocked smoke
are verified. Do not dispatch version 0.1.0 again.

npm account `shohzodbek` enabled 2FA with one security key. The exact reviewed
tarball published `fragment-donor-sdk@0.1.0`; its public metadata, clean registry
install and installed mocked smoke passed. A GitHub Actions Trusted Publisher is
now configured for `usnuz/fragment-donor-sdk`, `registry-publish.yml`, environment
`npm`, permitting `npm publish` (not `npm dist-tag`). The bootstrap version was a
direct authenticated upload, so it has registry signing but not GitHub OIDC
provenance. Do not republish immutable 0.1.0; use OIDC for later versions.

Packagist account `usnuz` was created through the authorized GitHub login and
the public repository was submitted as `fragment-donor/sdk`. Packagist crawled
v0.1.0 at exact release commit `9e8a9f8577936a37ed750f55f6604e475a545ad9`;
public metadata, a clean Composer install and installed mocked smoke passed. The
package currently reports that automatic GitHub updates are not configured.

NuGet account `shohzodbek` published the exact reviewed
`FragmentDonor.Sdk` 0.1.0 nupkg. Validation/indexing, the public feed, a clean
restore and installed mocked smoke passed. Policy `Fragment Donor GitHub Actions`
is Active for `usnuz/fragment-donor-sdk`, `registry-publish.yml`, environment
`nuget`, and only new versions of `FragmentDonor.Sdk`. The bootstrap was a direct
upload without GitHub OIDC provenance; do not republish immutable 0.1.0.

crates.io account `usnuz` has a verified email and published
`fragment-donor-sdk` 0.1.0 from exact release commit `9e8a9f8`. The public API
and crate download passed. GitHub Trusted Publishing is configured for
`registry-publish.yml`, environment `crates-io`; the narrow bootstrap token was
revoked and no API tokens remain.

First access batch: [PyPI](https://pypi.org/), [npm](https://www.npmjs.com/),
[Packagist](https://packagist.org/), [NuGet](https://www.nuget.org/),
[crates.io](https://crates.io/), [RubyGems](https://rubygems.org/),
[Postman](https://web.postman.co/). No fallback-browser auth bypass was used.

No credential, token, password, wallet seed, or cookie should be sent in chat.
Complete account authentication/2FA in the normal platform UI or configure a
scoped GitHub publishing secret/trusted publisher yourself.

The owner now authorizes all eligible publication. The remaining limitation is
access/policy/readiness, not an owner decision to defer every other platform.
RubyGems ownership is verified and 0.1.0 was published through GitHub Trusted
Publishing. Postman workspace ownership is verified and its public four-operation
documentation was published with the placeholder-only environment; no request
or purchase was run. The GitLab secondary mirror is public with the exact latest
source commit and both tags; GitHub remains authoritative. GitHub v0.1.0, the public Go
module/pkg.go.dev, PyPI 0.1.0, npm 0.1.0, Packagist v0.1.0, NuGet 0.1.0,
crates.io 0.1.0 and RubyGems 0.1.0 are verified published.

GitHub topics remain unset because the optional release action received HTTP403.
Using the genuine owner's repository UI, copy only the reviewed topic names from
[github-topics.json](github-topics.json), save, then reopen the public repository
and verify the displayed topics. Do not broaden CI token permissions merely for
optional launch metadata or extract sensitive credentials.

1. **Registry access/publishers:** allow the normal platform browser access when
   intended, sign in to each actual owner account, complete email/required 2FA,
   and confirm package ownership. Configure GitHub owner `usnuz`, repository
   `fragment-donor-sdk`, filename `registry-publish.yml`; exact environments are
   `pypi/python`, `npm`, `nuget`, `crates-io`, `rubygems`, `packagist`, `go-module`.
   [Owner setup fields](PUBLISHING_RUNBOOK.md#owner-setup-fields) lists pending
   publishers, `NUGET_USER`, Packagist initial submission and protected credentials.
   npm's publisher requires Node 22.14+/npm 11.5.1+, not the SDK runtime minimum.
   If crates.io cannot configure a new-crate/pending publisher, its first release
   needs the owner's secure Cargo publication before later OIDC releases.
2. **One registry per run:** after the exact tag has a verified stable GitHub
   release, open Actions → **Authorized registry publication**, use `main`, set
   `tag=v0.1.0`, select one package and explicitly `confirm=true`. Configure the
   chosen GitHub environment/protection first. Packagist's job only syncs an
   already submitted package; Go's job fetches `go/v0.1.0`, not a registry upload.
   Reopen the exact version and install from that registry before recording
   PUBLISHED. Do not rerun an already published immutable version as a repair.
3. **Search verification:** authenticate Search Console, Bing and Yandex; obtain
   their issued ownership methods and submit the actual live project sitemap.
   Google uses the project URL-prefix. If Yandex requires origin-root ownership,
   confirm separate control of `https://usnuz.github.io/`; this project repository
   cannot create origin-root verification files or grant `github.io` DNS rights.
   [Rights/sitemap steps](PUBLISHING_RUNBOOK.md#search-submission-and-verification).
   No Google/Bing/Yandex indexing or ranking guarantee is made.
4. **Mirrors/catalogs:** GitLab and SourceForge are complete as public imports, Read the Docs is complete as a
   public webhook-backed custom build, and Swagger Studio exposes the verified public 0.1.0 schema. Authenticate only an eligible TON App or RapidAPI account. Catalog
   acceptance and publication are distinct. Decline paid plans until explicitly
   authorized. Preserve a single primary canonical documentation site.
   Postman is complete: both generated artifacts were imported into a public
   workspace, wallet/provider values remained empty, real purchases remained
   disabled, and the published documentation was reopened successfully. HTTP 400
   `unconfirmed:true` in the synthetic examples remains an unknown payment outcome.
5. **Editorial/community channels:** inspect current platform/subreddit/group
   rules and AI policies before posting. Provide genuine product details and
   affiliation disclosure. Do not submit fabricated Stack Overflow questions.
   Human-only platforms need genuinely human-authored content, not AI text
   relabeled or lightly edited to evade a rule.
   Complete factual/editorial review and the platform's truthful AI disclosure.
   Prepared text, demo plans and upload workflow files do not prove publication.
6. **Credential trust boundary:** purchase requests transmit wallet mnemonic and
   Fragment session/cookie data to the API operator. Recommend server-side secret
   storage. Publishing client SDKs does
   not change production behavior.

Exact per-channel state and evidence: publication-status.json and PLATFORM_MATRIX.md.
