# Publishing runbook — Fragment Donor 0.1.0

Owner: `usnuz`. Repository: [fragment-donor-sdk](https://github.com/usnuz/fragment-donor-sdk).
Primary docs: [GitHub Pages](https://usnuz.github.io/fragment-donor-sdk/).
Independent project: no affiliation with Telegram, Fragment or TON.

## Approval and access

The owner authorized all **eligible** publication, not only GitHub/Pages.
Approval does not bypass a platform's rules, login, ownership, editorial
review, or paid-plan approval. PyPI 0.1.0 is published through its verified
trusted publisher; owner-confirmed run 37404248538 and a clean public-index
consumer were verified. npm 0.1.0 was bootstrapped from the reviewed tarball,
public-install verified, and its GitHub Actions Trusted Publisher is configured.
Packagist v0.1.0 is public and clean-install verified. NuGet 0.1.0 is public,
clean-restore verified, and its new-version-only Trusted Publishing policy is
active. crates.io 0.1.0 is public and its Trusted Publisher is configured; the
bootstrap token was revoked. RubyGems 0.1.0 is public through GitHub Trusted
Publishing. Postman public documentation is published with the reviewed
placeholder-only environment; no API request or purchase was run. The GitLab
secondary mirror is public at the exact latest source commit and both tags. Do not treat
a prepared workflow or package as a completed registry release. Other channels
remain NOT_RUN until their own access, eligibility and actual submission checks.
See [manual actions](manual-actions.md) and the authoritative
[status evidence](publication-status.json). Never work around a denied browser
permission by extracting a session cookie or credential.

## Release gates

1. All seven native SDK tests, builds and package-install smoke checks pass.
   Use only mocked/synthetic credentials. Do not fund a wallet for testing.
2. Run `node scripts/public-files.mjs`. This exports only reviewed UTF-8 source
   under this independent SDK root. Do not publish the backend checkout or history.
   Review each package archive and its source URL; exclude tools, caches, fixture
   secrets, server config, Git credential helpers, and production databases.
3. Build the static docs and run `node docs/test.mjs`. Check all EN/RU/UZ topics,
   links, canonical, reciprocal hreflang, sitemap, HTTP status, and JS-disabled
   text after deployment. Pages hosts documentation only, not wallet forms,
   transactions, or a commercial SaaS frontend.
4. Run the root GitHub CI workflow; inspect failed jobs rather than treating
   source generation as a test pass. Keep runtime and registry status separate.
5. Re-check registry names immediately before first release. On 2026-10-06 all
   six queried package metadata endpoints returned HTTP 404. This is availability
   evidence at that instant, not a reservation or publisher approval.
6. Confirm publisher account ownership, 2FA, trusted-publisher settings, and
   applicable registry rules. Never put registry secrets in chat or source.

## Native build and safe local validation

Run commands from repository root unless a `cd` is shown. Details and additional
lint/install-smoke commands live in each package README and CI workflow.

```sh
PYTHONPATH=python/src python -W error -m unittest discover -s python/tests -v
cd python && python -m build && python -m twine check dist/*
cd ../typescript && npm ci && npm test && npm pack
cd ..
cd php && composer install --no-interaction && composer test && composer lint && composer format:check
cd ..
composer validate --strict
composer archive --format=zip --dir=php/dist --file=fragment-donor-sdk-0.1.0
php php/tests/check-package.php php/dist/fragment-donor-sdk-0.1.0.zip
dotnet run --project dotnet/tests/FragmentDonor.Sdk.Tests -c Release
dotnet pack dotnet/src/FragmentDonor.Sdk -c Release -o dotnet/dist
dotnet run --project dotnet/tests/PackageCheck -c Release -- dotnet/dist/FragmentDonor.Sdk.0.1.0.nupkg
dotnet restore dotnet/tests/PackageSmoke --source "$PWD/dotnet/dist" --configfile dotnet/NuGet.Config
dotnet run --project dotnet/tests/PackageSmoke -c Release --no-restore
dotnet build dotnet/examples/QuickStart -c Release
for project in dotnet/src/FragmentDonor.Sdk dotnet/tests/FragmentDonor.Sdk.Tests dotnet/tests/PackageCheck dotnet/tests/PackageSmoke dotnet/examples/QuickStart; do
  dotnet format whitespace "$project" --no-restore --verify-no-changes
done
cd go && go test -race ./... && go vet ./... && go build ./...
sh scripts/check.sh
cd ../rust && cargo fmt --all -- --check && rustfmt --edition 2021 --check smoke/src/main.rs
cargo test --locked && cargo clippy --locked --all-targets -- -D warnings
cargo package --locked --allow-dirty && python smoke/verify.py
cd ../ruby && ruby scripts/check.rb && ruby -Ilib test/client_test.rb
gem build fragment-donor-sdk.gemspec && ruby smoke/verify.rb
```

Use the runtime equivalents in PowerShell; shell environment syntax above is
POSIX. Purchase examples are not part of CI. `--allow-dirty` packages only the
crate's reviewed include list; it is not permission to publish unrelated files.
PHP ZIP inspection needs `ext-zip`. The CI workflow also runs installed PHP
consumer checks and `python scripts/check-artifacts.py` over every package type;
follow its exact current commands before releasing, not just the short block.

## Prepared release automation

`.github/workflows/release.yml` responds to a stable version tag such as
`v0.1.0`, validates versions, reruns CI, inspects downloaded package artifacts,
and prepares a GitHub release with checksums. It also creates/verifies
`go/v0.1.0` at the same tested source commit. A tag push is a release action:
do it only after gates pass. An existing Go tag must not be moved silently.

The configured release job uses commit-pinned `actions/attest` v4 and GitHub OIDC
to attest **each of nine exact assets**: seven packages,
`release-provenance.json` and `SHA256SUMS`. Before publication it runs
`gh attestation verify` for every file against the exact source commit, release
tag/ref and signer workflow
`usnuz/fragment-donor-sdk/.github/workflows/release.yml`. Checksums detect byte
mismatches; a checksum file or unsigned provenance JSON is **not signed
provenance**. Attestations must actually exist and verify, not merely be declared
in YAML. No SLSA Level 3 claim is made.

`.github/workflows/registry-publish.yml` is separate and manual. In GitHub
Actions choose **Authorized registry publication**, run on `main`, set `tag` to
the exact verified stable GitHub release, choose **one** `package`, and explicitly
set `confirm=true`. The guarded workflow requires that public release; it does
not configure publisher accounts or prove registry acceptance. Configure the
corresponding GitHub environment and its protection/reviewer rules first.

Its validation job downloads all nine exact release files, checks package
contents/hashes/metadata, verifies successful release-run identity and matching
root/Go tags, then verifies **every signature** against the same source commit,
ref and release workflow. Only then can the single selected ecosystem publish
from the reviewed artifact handoff. Checksums alone do not replace that signature
gate or registry ownership.

### Owner setup fields

For GitHub-backed trusted publishers, enter repository owner `usnuz`, repository
`fragment-donor-sdk`, workflow filename **`registry-publish.yml`** (not its full
path), and the exact environment below. Use the actual owner account on each
registry; its username need not be `usnuz`. Complete its normal login, ownership
and required email/MFA/2FA steps. Do not put recovery codes, OTPs or credentials
in this repository, an issue, a workflow input, or chat.

| Workflow package | Registry/package | GitHub environment | First-release owner action |
| --- | --- | --- | --- |
| `python` | PyPI `fragment-donor-sdk` | `pypi/python` | PUBLISHED at 0.1.0 by successful owner-confirmed run 37404248538. PyPI provenance and clean public-index install/import/mocked smoke verified. Do not dispatch 0.1.0 again. |
| `node` | npm `fragment-donor-sdk` | `npm` | PUBLISHED at 0.1.0 from the exact reviewed tarball; clean public-registry install/mocked smoke passed. Trusted Publisher is configured for this workflow/environment with `npm publish` permission. The bootstrap release has registry signing but not GitHub OIDC provenance. Do not publish 0.1.0 again. |
| `dotnet` | NuGet `FragmentDonor.Sdk` | `nuget` | PUBLISHED at 0.1.0 from the exact reviewed nupkg; clean public-feed restore/mocked smoke passed. Active policy `Fragment Donor GitHub Actions` permits only new versions of `FragmentDonor.Sdk` from this workflow/environment. The bootstrap release was a direct upload and has no GitHub OIDC provenance. Set `NUGET_USER=shohzodbek` for future workflow validation. Do not publish 0.1.0 again. |
| `rust` | crates.io `fragment-donor-sdk` | `crates-io` | PUBLISHED at 0.1.0 from exact release commit `9e8a9f8`. GitHub Trusted Publishing is configured for this workflow/environment and the narrow bootstrap token is revoked. Do not republish immutable 0.1.0. |
| `ruby` | RubyGems `fragment-donor-sdk` | `rubygems` | PUBLISHED at 0.1.0 by owner-confirmed run `37423695304` through the pending GitHub Actions Trusted Publisher. Public download SHA-256 matches the exact GitHub release gem. Do not republish immutable 0.1.0. |
| `php` | Packagist `fragment-donor/sdk` | `packagist` | PUBLISHED at v0.1.0 from the public repository and exact release commit; clean Composer install/mocked smoke passed. Automatic GitHub updates are not configured. A future workflow sync still requires `PACKAGIST_USER` and protected `PACKAGIST_TOKEN`; no native Packagist OIDC is claimed. |
| `go` | `github.com/usnuz/fragment-donor-sdk/go` | `go-module` | Verify release-created `go/v0.1.0`; this job fetches the public module. pkg.go.dev indexing is a separate observation. |

npm trusted publishing requires at least **Node.js 22.14.0 and npm 11.5.1**;
the workflow uses a newer hosted runner setup. This publishing requirement is
different from the SDK's Node.js 20 runtime compatibility. Official setup:
[PyPI pending publisher](https://docs.pypi.org/trusted-publishers/creating-a-project-through-oidc/),
[npm](https://docs.npmjs.com/trusted-publishers/),
[NuGet trusted publishing](https://learn.microsoft.com/en-us/nuget/nuget-org/trusted-publishing),
[crates.io](https://crates.io/docs/trusted-publishing),
[Cargo credential setup](https://doc.rust-lang.org/cargo/reference/registry-authentication.html),
[RubyGems pending publishers](https://guides.rubygems.org/trusted-publishing/),
[Packagist submission](https://packagist.org/about).

## Registry release order

| Registry | Identifier | Publication and verification |
| --- | --- | --- |
| PyPI | `fragment-donor-sdk` | Configure GitHub trusted publisher or secure scoped upload credentials. Upload only verified wheel/sdist, then inspect the exact version page and install it in a clean environment. |
| npm | `fragment-donor-sdk` | 0.1.0 is published and verified. For later versions use the configured Trusted Publisher, inspect the exact registry metadata, and perform a clean install. Never overwrite immutable 0.1.0. |
| Packagist | `fragment-donor/sdk` | v0.1.0 is published from the root manifest and verified by a clean public Composer install. Configure an approved update mechanism before later versions; do not resubmit the package. |
| NuGet | `FragmentDonor.Sdk` | 0.1.0 is published and verified by a clean public-feed restore. For later versions use the active new-version-only Trusted Publishing policy, inspect the exact registry metadata/signature, and perform a clean restore. Never overwrite immutable 0.1.0. |
| Go / pkg.go.dev | `github.com/usnuz/fragment-donor-sdk/go` | Publish the **go/v0.1.0** tag pointing to tested source. Module resides in go/. Fetch through proxy.golang.org and verify docs on pkg.go.dev. A root v0.1.0 tag is not a Go submodule release. |
| crates.io | `fragment-donor-sdk` | 0.1.0 is published and public-download verified. For later versions use the configured Trusted Publisher, inspect registry metadata/checksum, and perform a clean consumer build. Never overwrite immutable 0.1.0. |
| RubyGems | `fragment-donor-sdk` | 0.1.0 is published through the configured GitHub Trusted Publisher and public-download verified. For later versions use the gem's trusted publisher, inspect registry metadata/checksum, and perform a clean install. Never overwrite immutable 0.1.0. |

Do not rename/reuse somebody else's existing package or silently reserve alternate
names. A registry URL returning 404 is not a completed publication. Published
versions are generally immutable: correct errors with a new patch release.
Official instructions: [PyPI trusted publishing](https://docs.pypi.org/trusted-publishers/using-a-publisher/),
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers/),
[Packagist root-package submission](https://packagist.org/about),
[NuGet publication](https://learn.microsoft.com/en-us/nuget/nuget-org/publish-a-package),
[Go module publication](https://go.dev/doc/modules/publishing),
[Cargo publication](https://doc.rust-lang.org/cargo/reference/publishing.html),
[RubyGems publication](https://guides.rubygems.org/publishing/).

## Hosting, catalogs, content

Publish the GitHub source and primary static docs before linking them from
catalogs. GitLab/SourceForge/ReadTheDocs are mirrors or clearly secondary pages. Read the Docs is published through
the root `.readthedocs.yaml` custom Node build at `https://fragment-donor-sdk.readthedocs.io/en/latest/`;
SourceForge is published at `https://sourceforge.net/projects/fragment-donor-sdk/` with source and reviewed v0.1.0 downloads.
Swagger Studio publishes the OpenAPI 0.1.1 schema as the default version at
`https://app.swaggerhub.com/apis/independent-7a3/fragment-donor-sdk/0.1.1`; the public page reopened successfully.
do not create duplicate canonical SEO sites. Run `node contract/build.mjs` then
`node docs/build.mjs`; Postman import uses separate `site/postman.json` and
`site/postman.environment.json`. Review collection, local/current/shared and
environment values: wallet/provider fields must stay empty and
`allow_real_purchases=false`. Saved responses are explicitly synthetic: success,
429, 503, and purchase HTTP 400 with `unconfirmed: true`/`tx_hash`. That 400 means
**unknown payment outcome**, not ordinary rejected validation; reconcile rather
than resending. Do not execute real purchases for a listing. Swagger Studio imported the public OpenAPI without
introducing a fake service-key scheme. APIs.guru issue
`https://github.com/APIs-guru/openapi-directory/issues/3556` is SUBMITTED under the owner's explicit CC0 approval;
review is distinct from acceptance. RapidAPI is a separately chosen gateway model, not proof that
the direct API requires authentication. Do not accept a paid plan or gateway
contract on the user's behalf.

Use PLATFORM_MATRIX.md for complete channel requirements and content/ for
prepared assets. Recheck each community's actual rules immediately before a
post. No fabricated questions, fake user reviews, cross-post flooding, private
outreach, vote solicitation, or AI posts on platforms that prohibit them.
Local presentation assets now include a CSS-only synthetic fixture viewer,
five 1920×1080 rendered PNG/SVG frames and a 50-second silent H.264 captioned
video. See [Product Hunt pack](content/10-product-hunt.md) and
[video pack](content/11-youtube.md) for actual files/metadata. They are not live
transactions, screencasts, human narration or platform publication. Verify the
demo after actual deployment; review gallery/captions and channel requirements
before any upload. Do not use the planned long-form chapter times for the
existing 50-second video.

Hacker News and English Stack Overflow prohibit generated posts; those channels
are not eligible for AI-generated submission. Russian Stack Overflow has its
own policy; only a genuine matching question can justify an attributed answer.
Never mark an editorially reviewed submission PUBLISHED before acceptance.

## Search submission and verification

Submit `https://usnuz.github.io/fragment-donor-sdk/sitemap.xml` only after the live
site returns HTTP 200. These are three separate owner-access tasks; none has a
verified search submission merely because the sitemap is hosted:

1. **Google Search Console:** add URL-prefix
   `https://usnuz.github.io/fragment-donor-sdk/`, not a `github.io` domain property.
   Use the account-issued verification method; a meta tag belongs in the project
   homepage `<head>` through a reviewed build change. Then submit the live sitemap.
   [Official ownership verification](https://support.google.com/webmasters/answer/9008080).
2. **Bing Webmaster Tools:** sign in, import a genuinely verified property or use
   the verification method issued for the accepted site property, then submit the
   same sitemap. Do not fabricate or reuse somebody else's verification token.
   [Official ownership help](https://www.bing.com/webmasters/help/verifying-ownership-of-your-site-afcfefc6).
3. **Yandex Webmaster:** add the site property the current UI actually accepts,
   then use its issued HTML-file or `yandex-verification` meta-tag method and
   retain that verification. If it requires the origin `https://usnuz.github.io/`
   rather than the project path, this repository alone cannot publish the origin
   verification file/homepage tag. The owner must separately control that origin
   site, or record the rights/access blocker. Owning this project does **not**
   grant DNS control of `github.io`. In the verified property's **Indexing →
   Sitemap files**, add the live project sitemap above; observe processing and
   indexed URLs separately. [Official rights verification](https://yandex.com/support/webmaster/en/service/rights.html),
   [sitemap instructions](https://yandex.com/support/webmaster/en/indexing-options/sitemap).

Project-path robots.txt is downloadable, but crawlers discover robots.txt at the
origin root `https://usnuz.github.io/robots.txt`, not under the project path. Do not
claim control of that root from this repository. Sitemap submission and ordinary
links remain useful. Never apply another user's verification token.

Cross-posted blog articles should reference the exact primary topic as canonical
where the platform supports it. Translated primary pages self-canonicalize; don't
canonicalize all translations to English. An accepted webmaster submission is SUBMITTED,
an observed indexed URL is a separate verified event, and rankings are not
guaranteed. Do not call unverified search appearance a publication.

## Status evidence

Update publication-status.json with exact URL, observed timestamp, version, and
evidence after each verified operation. Allowed channel states: PUBLISHED,
SUBMITTED, READY, BLOCKED_ACCESS, NOT_ELIGIBLE, NOT_RUN. READY means a prepared
payload, not public publication. Record external failures and the one required
human action in manual-actions.md. Keep secrets out of evidence/logs.
