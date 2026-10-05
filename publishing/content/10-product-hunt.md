# Product Hunt launch pack

Status: READY text/plan; **NOT_RUN** gallery completion, interactive demo,
submission and approval. Account/launch access not assumed. This AI-assisted
draft needs maker review. No invented customer quote, vote, download or payment.

## Product fields — copy

Name: **Fragment Donor SDKs**

Tagline: **Seven server SDKs for Telegram Stars and Premium integrations**

Product URL: https://github.com/usnuz/fragment-donor-sdk

Documentation: https://usnuz.github.io/fragment-donor-sdk/en/

Topics to select if available: Developer Tools, Open Source, API.

Description:

> Fragment Donor provides independent server-side SDKs for Python, Node.js/
> TypeScript, PHP, .NET, Go, Rust and Ruby. Integrate username lookup, wallet
> balance, Telegram Stars gifting and Premium gifting through one documented
> form-urlencoded contract. Typed errors expose 429/Retry-After; exact balance
> strings preserve precision. Purchases never automatically retry, even after
> timeout or 5xx. EN/RU/UZ documentation and synthetic mock tests are included.
>
> This is not an official Telegram, Fragment or TON product. Direct API service
> auth is not required, but wallet operations need sensitive credentials; the
> inspected backend stores submitted credentials. SDK redaction does not remove
> that retention. Version 0.1.0 source/builds are prepared; consult publication
> status before using any registry install command. No real purchase is shown.

## Maker comment — copy after identity review

> I maintain the Fragment Donor project. This text was prepared with AI assistance.
> The engineering constraint worth reviewing is our no-duplicate-purchase rule:
> read-only requests can opt into bounded retries, while a Stars/Premium POST is
> never replayed automatically. A timeout can mean the payment happened and the
> reply was lost; this backend offers no idempotency guarantee.
>
> The source includes mocked failure cases and credential-redaction tests across
> seven runtimes. Documentation is available in English, Russian and Uzbek.
> Please inspect the trust boundary before using a real wallet: the backend
> records submitted credentials, so this is not a non-custodial claim. Feedback
> on transport interfaces, unknown-outcome UX and the docs is welcome.

Only use first-person maker text if the publishing account is genuinely the
maintainer. Do not ask users to upvote or privately message voters.

## Gallery and demo plan

| Shot | What to show | Safety / state |
| --- | --- | --- |
| 1 | Static EN/RU/UZ language navigation and four-operation reference | Docs-only browser; no admin/session/secret tabs |
| 2 | Python/Node source and one credential-free mocked lookup | Synthetic fixtures, visible “mock” label; no live recipient claim |
| 3 | 429 wait hint and read-retry settings | Fixture response; no fabricated production rate measurement |
| 4 | Timeout after one purchase dispatch in mock test | Counter remains 1; no real TON transfer or success animation |
| 5 | Credential-retention disclosure and package publication status | Show limitations, not “zero storage” marketing |

There is a local docs screenshot at `publishing/screenshots/docs-uz.jpg` prepared
elsewhere in this run; inspect pixels and platform dimension requirements before
using it. A screenshot does not prove the product is submitted or approved.
Additional gallery assets and demo recording are still required.

Interactive demo requirement: a visitor should be able to run deterministic
source tests or a read-only/mock walkthrough without entering a mnemonic. Do not
add a public wallet-secret form to Pages. A docs-only landing page is not a
claim of a completed interactive product launch.

## Submission checklist

1. Sign in to a genuine authorized personal account; satisfy onboarding normally.
2. Recheck [posting rules](https://help.producthunt.com/en/articles/479557-how-to-post-a-product)
   and [sharing rules](https://help.producthunt.com/en/articles/2690626-how-do-i-share-my-post).
3. Supply actual gallery/demo and correct product links; preserve disclosures.
4. Submit or schedule without paid promotion. Record submission evidence; call it
   `SUBMITTED`, not `PUBLISHED`, until the actual public listing is reopened.
5. No vote incentives, fake accounts, coordinated upvotes or unsolicited DM.

## Optional localized overview

RU: Семь независимых серверных SDK для интеграции Telegram Stars/Premium: типы,
429/Retry-After, точные строки баланса и запрет автоматических повторов платежа.
Backend хранит переданные credentials; проект не официальный и не non-custodial.

UZ: Telegram Stars/Premium uchun yetti mustaqil server SDK: typed xatolar,
429/Retry-After, aniq balans stringlari va avtomatik takrorlanmaydigan xarid.
Backend credentiallarni saqlaydi; loyiha rasmiy yoki non-custodial servis emas.
