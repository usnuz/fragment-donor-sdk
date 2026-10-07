# Manual actions requiring owner access

## Current verified state

Fragment Donor SDK `0.1.3` is public on GitHub and all seven package channels:
PyPI, npm, Packagist, NuGet, the Go module proxy/pkg.go.dev, crates.io and
RubyGems. GitHub, GitLab and SourceForge carry the current source history and
release tags. GitHub Pages and Read the Docs serve the current multilingual
documentation. Postman, Swagger Studio and RapidAPI remain separate API-contract
surfaces at schema version `0.1.1`.

Published registry versions and historical release artifacts are immutable. Do
not re-dispatch an already published version as a repair. The failed historical
PyPI run `37364162843` must not be re-dispatched.

No credential, password, wallet seed, session cookie or provider key belongs in
chat, public source, examples or screenshots. Purchase requests transmit wallet
mnemonic and Fragment session/cookie data to the API operator. No real API
request or payment is part of publication verification.

## Remaining owner-gated work

1. **API-contract mirrors:** keep Swagger Studio and RapidAPI at version `0.1.1`
   unless the documented version policy changes. Their existing definitions
   must use the sanitized neutral schema text. Postman is already current and
   needs no action.
2. **Search discovery:** Google Search Console ownership is verified and its
   sitemap was submitted, but successful fetch/indexing is not yet verified.
   Bing and Yandex require their normal owner login and issued verification
   method. Search submission never guarantees indexing or ranking.
3. **Catalog/editorial/community channels:** recheck current platform rules and
   account access immediately before any submission. Public posts, comments,
   launches and catalog submissions require explicit target-specific approval.
   Do not submit AI-generated material to human-only platforms or fabricate a
   question, endorsement, vote or community interaction.
4. **Explicit exclusions:** do not submit to TON App. YouTube remains skipped.
   LinkedIn remains skipped at its identity-document gate. Do not attempt paid
   promotion or a subscription upgrade without separate approval.
5. **Optional repository metadata:** GitHub topics may be applied through the
   genuine owner UI using only the reviewed values in
   [github-topics.json](github-topics.json). Do not broaden workflow-token
   permissions for optional metadata.

Exact per-channel state and evidence are maintained in
[publication-status.json](publication-status.json) and
[PLATFORM_MATRIX.md](PLATFORM_MATRIX.md).
