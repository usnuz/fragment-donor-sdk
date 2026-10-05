# Copy-ready publication assets

Prepared 2026-10-05, version 0.1.0. These are **AI-assisted/generated drafts**,
not evidence of human editorial review, publication, video recording, payment
success, registry availability, or search indexing. The owner selected source
and primary docs publication; other channels are deferred. Read
[the policy matrix](../PLATFORM_MATRIX.md) before using any asset.

The body under each “Article”/“Copy” heading can be pasted after factual/editorial
review. Keep the visible AI/independent-service/credential-retention disclosures.
Do not use generated text on HN, English Stack Overflow, Habr, HackerNoon,
r/SaaS, or r/webdev where the checked rules reject this use. Their files contain
human-only factual checklists instead, not forbidden post templates.

| Required material | Artifact |
| --- | --- |
| English API quick start | [01](01-api-quickstart-en.md) |
| Python Stars integration | [02](02-python-stars-en.md) |
| Node.js/TypeScript Stars integration | [03](03-node-stars-en.md) |
| Premium gifting | [04](04-premium-en.md) |
| Balance and username | [05](05-balance-username-en.md) |
| 429, Retry-After, flood wait | [06](06-flood-wait-en.md) |
| Seven SDK install/example comparison | [07](07-seven-sdks-en.md) |
| Russian integration | [08](08-integration-ru.md) |
| Uzbek integration | [09](09-integration-uz.md) |
| Product Hunt text/gallery/demo plan | [10](10-product-hunt.md) |
| Video script/recording/metadata/chapters | [11](11-youtube.md) |
| Eight community-specific Reddit paths | [12](12-reddit.md) |
| Actual-question Q&A gates | [13](13-qa-human-checklist.md) |
| Human-authored HN fact/demo checklist | [14](14-hn-human-checklist.md) |
| Repository, mirrors, directories | [Platform assets](platform-assets.md) |
| DEV / Hashnode / Medium / LinkedIn / IH | [DEV](dev-to.md), [Hashnode](hashnode.md), [Medium](medium.md), [LinkedIn](linkedin.md), [IH](indie-hackers.md) |
| Human-only editorial paths | [Habr / HackerNoon / vc.ru](human-editorial-checklists.md) |
| Exact TON Telegram / Discord verification | [Community pack](21-ton-communities.md) |

Source: https://github.com/usnuz/fragment-donor-sdk. Primary documentation:
https://usnuz.github.io/fragment-donor-sdk/en/, `/ru/`, `/uz/`.
Actual release/publication state: [status JSON](../publication-status.json).

## Crosspost canonical rule

These drafts do not have a published original article URL. First publish the
chosen original on an eligible author-owned channel and reopen its exact public
URL. Only a literal republication of that article gets that URL as its canonical
in DEV/Hashnode/Medium where supported. **Do not replace an unresolved canonical
with a docs homepage**, a nonexistent article slug, or another language version.
New platform-specific articles are originals, not forced crossposts. Keep source
and topic-specific docs links as citations even when canonical is unset.

## Safety contract in every substantive article

The direct service is authless, but purchases use Mnemonic + Fragment Cookie;
optional `Api-Key` is a TonConsole provider key. All four operations share the
default per-IP 30/minute limit. Purchases never auto-retry; no idempotency guarantee
or purchase-status endpoint exists. Backend stores submitted credentials. Public
examples are mocked/read-only or explicitly purchase-gated; never fund a demo
wallet or paste a real secret to make an article, screenshot, or video.
