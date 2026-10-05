# Publishing runbook — Fragment Donor 0.1.0

Owner: `usnuz`. Repository: [fragment-donor-sdk](https://github.com/usnuz/fragment-donor-sdk).
Primary docs: [GitHub Pages](https://usnuz.github.io/fragment-donor-sdk/).
Independent project: no affiliation with Telegram, Fragment or TON.

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
5. Re-check registry names immediately before first release. On 2026-10-05 all
   six queried package metadata endpoints returned HTTP 404. This is availability
   evidence at that instant, not a reservation or publisher authorization.
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
php php/tests/lint.php
php -d zend.exception_ignore_args=1 php/tests/run.php
composer validate --strict
composer archive --format=zip --dir=php/dist --file=fragment-donor-sdk-0.1.0
dotnet run --project dotnet/tests/FragmentDonor.Sdk.Tests -c Release
dotnet pack dotnet/src/FragmentDonor.Sdk -c Release -o dotnet/dist
dotnet restore dotnet/tests/PackageSmoke --source "$PWD/dotnet/dist" --configfile dotnet/NuGet.Config
dotnet run --project dotnet/tests/PackageSmoke -c Release --no-restore
cd go && go test -race ./... && go vet ./... && go build ./...
cd ../rust && cargo test --locked && cargo clippy --locked --all-targets -- -D warnings
cargo package --locked --allow-dirty
cd ../ruby && ruby -Ilib test/client_test.rb && gem build fragment-donor-sdk.gemspec
```

Use the runtime equivalents in PowerShell; shell environment syntax above is
POSIX. Purchase examples are not part of CI. `--allow-dirty` packages only the
crate's reviewed include list; it is not permission to publish unrelated files.

## Registry release order

| Registry | Identifier | Publication and verification |
| --- | --- | --- |
| PyPI | `fragment-donor-sdk` | Configure GitHub trusted publisher or secure scoped upload credentials. Upload only verified wheel/sdist, then inspect the exact version page and install it in a clean environment. |
| npm | `fragment-donor-sdk` | Publish the verified tarball from typescript/ with public access. npm trusted publishing requires package/account setup; use its official instructions. Verify `npm view fragment-donor-sdk@0.1.0` and a clean install. |
| Packagist | `fragment-donor/sdk` | Root composer.json uses php/src/; submit the public repo, publish v0.1.0 tag, enable synchronization. A PHP subdirectory alone is not a valid root package. Verify Composer installs actual classes from the release. |
| NuGet | `FragmentDonor.Sdk` | Push the verified nupkg through a scoped account credential, verify 0.1.0 registration and restore/use from nuget.org. |
| Go / pkg.go.dev | `github.com/usnuz/fragment-donor-sdk/go` | Publish the **go/v0.1.0** tag pointing to tested source. Module resides in go/. Fetch through proxy.golang.org and verify docs on pkg.go.dev. A root v0.1.0 tag is not a Go submodule release. |
| crates.io | `fragment-donor-sdk` | After cargo test/package verification, publish from rust/ using the authorized publisher. Verify version, ownership, metadata, and clean cargo build. |
| RubyGems | `fragment-donor-sdk` | Push the verified gem through the owner's authenticated MFA-capable session; verify 0.1.0 page and isolated gem install. |

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
catalogs. GitLab/SourceForge/ReadTheDocs are mirrors or clearly secondary pages;
do not create duplicate canonical SEO sites. Postman import uses the guarded
collection; real purchase execution is disabled. Swagger Studio imports OpenAPI
and must not introduce a fake service-key scheme. APIs.guru review is distinct
from acceptance. RapidAPI is a separately chosen gateway model, not proof that
the direct API requires authentication. Do not accept a paid plan or gateway
contract on the user's behalf.

Use PLATFORM_MATRIX.md for complete channel requirements and content/ for
prepared assets. Recheck each community's actual rules immediately before a
post. No fabricated questions, fake user reviews, cross-post flooding, private
outreach, vote solicitation, or AI posts on platforms that prohibit them.
Hacker News and English Stack Overflow prohibit generated posts; those channels
are not eligible for AI-generated submission. Russian Stack Overflow has its
own policy; only a genuine matching question can justify an attributed answer.
Never mark an editorially reviewed submission PUBLISHED before acceptance.

## Search submission and verification

Submit `https://usnuz.github.io/fragment-donor-sdk/sitemap.xml` only after the live
site returns HTTP 200. Search Console uses a URL-prefix property for the project
path, not domain DNS ownership of github.io. Supply the platform-issued meta
verification value in a reviewed build change. Bing Webmaster Tools can import a
verified property or use its issued verification method. These account checks
are manual when no access is available.

Project-path robots.txt is downloadable, but crawlers discover robots.txt at the
origin root `https://usnuz.github.io/robots.txt`, not under the project path. Do not
claim control of that root from this repository. Sitemap submission and ordinary
links remain useful. Never apply another user's verification token.

Cross-posted blog articles should reference the exact primary topic as canonical
where the platform supports it. Translated primary pages self-canonicalize; don't
canonicalize all translations to English. Search Console submission is SUBMITTED,
an observed indexed URL is a separate verified event, and rankings are not
guaranteed. Do not call unverified search appearance a publication.

## Status evidence

Update publication-status.json with exact URL, observed timestamp, version, and
evidence after each verified operation. Allowed channel states: PUBLISHED,
SUBMITTED, READY, BLOCKED_ACCESS, NOT_ELIGIBLE, NOT_RUN. READY means a prepared
payload, not public publication. Record external failures and the one required
human action in manual-actions.md. Keep secrets out of evidence/logs.
