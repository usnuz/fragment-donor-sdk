# Product Hunt launch pack

Status: READY AI-generated text, five local synthetic gallery frames, CSS-only
fixture viewer and 50-second rendered video. **NOT_RUN** Product Hunt submission
and approval; public deployment/upload not inferred from local files. Eligible
publication is authorized, but account/onboarding and maker review remain.
No invented customer quote, vote, download or payment.

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

## Actual local gallery and demo assets

| Asset | Actual content | Safety / state |
| --- | --- | --- |
| [01-overview.png](../media/01-overview.png) | Four paths and seven server SDKs | Rendered overview, not a live request or screenshot |
| [02-wire-contract.png](../media/02-wire-contract.png) | Form-urlencoded purchase and placeholder-only headers | No real wallet/session/provider value |
| [03-retry-errors.png](../media/03-retry-errors.png) | Synthetic 429/503, bounded read waits and no purchase replay | Not measured production telemetry |
| [04-unknown-purchase.png](../media/04-unknown-purchase.png) | HTTP 400 `unconfirmed:true` and synthetic reconciliation fields | Not validation rejection or transaction confirmation |
| [05-retention-evidence.png](../media/05-retention-evidence.png) | Backend credential-retention boundary | No zero-retention, official-affiliation or security-certification claim |

The five PNGs are 1920×1080; editable SVG companions and SHA-256/size records are
in [assets.json](../media/assets.json). Inspect the current form's dimensions
before selecting/cropping. [walkthrough-en.mp4](../media/walkthrough-en.mp4) is a
50-second **silent rendered synthetic walkthrough**, with English captions and
[SRT](../media/walkthrough-en.srt); it is not a screencast, live SDK execution,
human narration or successful purchase. Local existence does not prove upload.

The local fixture viewer `site/demo/index.html` ([generator](../../demo/build.mjs)) switches pre-rendered
responses for four operations using CSS/radio controls: no executable JavaScript,
API request, secret input or invented dispatch counter. Intended public URL:
`https://usnuz.github.io/fragment-donor-sdk/demo/`; reopen it after deployment
before submitting as a live demo. Source tests, not this viewer, establish request
counts. This is a mock-only product preview, not completed platform launch.

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
