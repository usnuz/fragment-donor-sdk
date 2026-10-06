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

First access batch: [PyPI](https://pypi.org/), [npm](https://www.npmjs.com/),
[Packagist](https://packagist.org/), [NuGet](https://www.nuget.org/),
[crates.io](https://crates.io/), [RubyGems](https://rubygems.org/),
[Postman](https://web.postman.co/). No fallback-browser auth bypass was used.

No credential, token, password, wallet seed, or cookie should be sent in chat.
Complete account authentication/2FA in the normal platform UI or configure a
scoped GitHub publishing secret/trusted publisher yourself.

The owner now authorizes all eligible publication. The remaining limitation is
access/policy/readiness, not an owner decision to defer every other platform.
Login/ownership on crates.io, RubyGems and Postman is still unverified. No
publication on those three services is claimed. GitHub v0.1.0, the public Go
module/pkg.go.dev, PyPI 0.1.0, npm 0.1.0, Packagist v0.1.0 and NuGet 0.1.0 are
verified published.

GitHub topics remain unset because the optional release action received HTTP403.
Using the genuine owner's repository UI, copy only the reviewed topic names from
[github-topics.json](github-topics.json), save, then reopen the public repository
and verify the displayed topics. Do not broaden CI token permissions merely for
optional launch metadata or extract stored credentials.

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
4. **Mirrors/catalogs:** authenticate only the eligible GitLab, ReadTheDocs,
   SourceForge, Postman, Swagger Studio, TON App or RapidAPI account. Catalog
   acceptance and publication are distinct. Decline paid plans until explicitly
   authorized. Preserve a single primary canonical documentation site.
   Postman needs permitted workspace editing access: import both generated
   collection/environment files, keep wallet/provider values empty and real
   purchases disabled; reopen any public listing logged out. HTTP 400
   `unconfirmed:true` in the synthetic examples is an unknown payment outcome.
5. **Editorial/community channels:** inspect current platform/subreddit/group
   rules and AI policies before posting. Provide genuine product details and
   affiliation disclosure. Do not submit fabricated Stack Overflow questions.
   Human-only platforms need genuinely human-authored content, not AI text
   relabeled or lightly edited to evade a rule.
   Complete factual/editorial review and the platform's truthful AI disclosure.
   Prepared text, demo plans and upload workflow files do not prove publication.
6. **Backend credential retention:** the existing API persists raw purchase
   credentials. A separate backend hardening task is needed before claiming
   zero retention. Publishing client SDKs does not change production behavior.

Exact per-channel state and evidence: publication-status.json and PLATFORM_MATRIX.md.
