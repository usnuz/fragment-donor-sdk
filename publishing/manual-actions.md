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

1. **API-contract mirrors:** Swagger Studio 0.1.1 is sanitized and independently
   verified through its official read API. RapidAPI remains public, Active and
   Current at 0.1.1, but its Studio rejected the sanitized OpenAPI re-import
   with HTTP 400 and left the upload unsaved. Do not claim the RapidAPI text is
   reconciled until the platform accepts an update. Postman is already current.
2. **Search discovery:** Google Search Console ownership is verified and its
   sitemap was re-submitted successfully on 2026-10-07, but the table still
   reports `Not fetched`; successful fetch/indexing is not yet verified.
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
5. **Repository metadata:** the reviewed topics from
   [github-topics.json](github-topics.json) are applied through the owner UI:
   `python`, `sdk`, `telegram-premium`, `telegram-stars`, `ton`, `typescript`.
   Workflow-token permissions were not broadened.

Exact per-channel state and evidence are maintained in
[publication-status.json](publication-status.json) and
[PLATFORM_MATRIX.md](PLATFORM_MATRIX.md).
