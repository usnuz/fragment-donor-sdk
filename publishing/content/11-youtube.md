# YouTube: script, recording checklist and metadata

Status: READY AI-generated script and an actual 50-second silent rendered
synthetic video with verified public Pages media delivery. YouTube upload and
YouTube public-listing verification, live screencast and narration
are **NOT_RUN**. Eligible publication is authorized; channel access and review
are not assumed. Every purchase image is explicitly synthetic, not a real order.

## Actual generated short video

[walkthrough-en.mp4](../media/walkthrough-en.mp4): H.264, 1920×1080, 30 fps,
50 seconds, **no audio**. Five rendered PNG/SVG frames have visible synthetic
labels; English subtitle track and [SRT](../media/walkthrough-en.srt) are provided.
[Size/hash metadata](../media/assets.json) and [local verification](../media/verification.json)
describe these files, not a successful YouTube upload or live SDK execution.
This is not a screen recording, human narration, customer testimonial or payment
proof. The longer narration script below remains a separate unrecorded option.

An existing [Uzbek-docs baseline JPEG](../media/docs-uz-baseline.jpg) is available
as a separate reviewed still, with [its own metadata](../media/docs-uz-baseline.json).
It predates the current demo/footer and is **not a new current-UI capture**,
screen recording or payment proof. Exact capture time is unknown; its timestamp
is only source-file modification time. The [public JPEG](https://usnuz.github.io/fragment-donor-sdk/demo/media/docs-uz-baseline.jpg)
returned HTTP200 with exact original bytes/hash verified at 2026-10-05 17:35 UTC;
that does not establish a YouTube upload or newly captured current UI.

Use these exact chapters only for this 50-second file:

```text
00:00 Rendered synthetic overview — no API requests
00:10 Form contract and wallet credential boundary
00:20 Retry hints are not purchase replay permission
00:30 HTTP 400 unconfirmed — reconcile unknown outcome
00:40 Credential transmission and actual evidence
```

Short-video title: **Fragment Donor SDK contract: a 50-second synthetic walkthrough**.
Description addition: “Silent rendered diagrams, English captions; not a live
transaction or screencast. No API request, wallet-secret input or funds spent.”
Keep source/docs/credential-transmission/independent-project disclosures from the metadata below.

## Metadata — EN

Title: **Telegram Stars API: safe Python and Node SDK integration, no real purchase**

Description:

> A server-side walkthrough of Fragment Donor's four endpoints, typed Python and
> Node.js clients, exact balance strings, 429/Retry-After and why purchase POSTs
> never automatically retry. Every purchase/error demonstration is mocked; no
> real Stars/Premium order or wallet transfer is performed.
>
> Independent project, not an official Telegram, Fragment or TON product.
> No service API key is required, but wallet operations need sensitive credentials.
> Purchase requests transmit wallet mnemonic and Fragment session/cookie data to the API operator; SDK log redaction does not
> prevent operator access. Keep secrets on a trusted server, never in browser
> code or localStorage. Script prepared with AI assistance; the uploader must
> review actual narration, visuals and synthetic-media disclosures.
>
> Source: https://github.com/usnuz/fragment-donor-sdk
> Docs: https://usnuz.github.io/fragment-donor-sdk/en/
> Release state: https://github.com/usnuz/fragment-donor-sdk/blob/main/publishing/publication-status.json

Long-form planned chapters (**not** timestamps for the existing 50-second file;
adjust only after actually recording/editing the longer tutorial):

```text
00:00 Independent project and mock-only demo
00:40 No service auth versus wallet credentials
01:30 Four endpoints and form-urlencoded contract
02:20 Python username quick start
03:10 Server-only Node.js and decimal balance strings
04:10 429 Retry-After and bounded read retries
05:20 One purchase POST after timeout: mock request counter
06:30 Credential transmission and safe server configuration
07:30 Source, multilingual docs and release status
```

Tags: `Telegram Stars API`, `Python SDK`, `Node.js API`, `Retry-After`, `SDK testing`.
Avoid tags implying official affiliation, guaranteed earnings or successful gift.

## Shot-by-shot narration

1. **Opening, docs page.** “This is Fragment Donor, an independent SDK project.
   We will inspect source and mocked requests; no real purchase happens today.
   The clients are tools, not a guarantee that a wallet operation is risk-free.”
2. **Contract table.** “Service auth is absent: no account, Authorization or
   X-Api-Key. But purchase headers still include your Fragment Cookie and wallet
   Mnemonic. Api-Key, when present, configures TonConsole, not service login.”
3. **Source request model.** “Username goes in the lookup query. Stars amount and
   Premium duration go in a form-urlencoded POST, not JSON. Stars accept 50 to
   one million; Premium durations are 3, 6 or 12 months. We'll never place a real
   mnemonic in this terminal.”
4. **Python mocked lookup test.** “The typed result preserves extra server fields.
   This test uses a synthetic response. A real lookup would be read-only and
   consume one request from the shared quota; it's not a payment preapproval.”
5. **Node build/types and mock balance.** “Node 20+ native fetch is server-only.
   Browser Cookie rules and mnemonic exposure rule out frontend purchase code.
   Balances remain strings so a large decimal is not rounded by Number.”
6. **429 test.** “The normal quota is shared across the four endpoints. Retry-After
   can be seconds or an HTTP date; JSON wait hints also count. Longest valid hint
   wins. Default retry and waiting are off. Reads can opt into at most two
   retries and 60 seconds per wait; a longer hint is not shortened.”
7. **Mock purchase timeout, request counter.** “Here the injected transport times
   out after dispatch. The purchase counter remains one. Retrying could spend
   twice: this backend has no idempotency guarantee or purchase-status endpoint.
   Production code must reconcile wallet and recipient evidence first. HTTP 400
   with unconfirmed:true and a tx_hash is also unknown outcome, not validation
   rejection or proof that no funds were spent.”
8. **Security guide.** “Client redaction and redirect refusal reduce accidental
   leakage. Purchase requests transmit sensitive credentials to the API operator.
   Use a dedicated minimally funded wallet and evaluate
   operator access. Do not put seeds in public Postman variables or screenshots.”
9. **Closing, status JSON.** “Seven source packages and three documentation
   languages are available in the project. A local build is not a registry
   release; check the actual state before copying an install command. The source
   tests can be run without funding any wallet.”

## Recording and upload checklist

- Use a clean browser profile and terminal with synthetic fixtures only. Turn off
  password-manager popups, notification overlays, cloud sync and secret history.
- Run local mock tests, not purchase commands or a funded wallet balance. Keep
  `FRAGMENT_ALLOW_PURCHASES` unset. Do not expose environment dumps.
- Show “MOCK — NO REAL PAYMENT” during every purchase/error clip. Avoid staged
  success animations that could be mistaken for real blockchain completion.
- Capture code/read-only docs at legible resolution. Inspect every frame/audio
  cut for tokens, cookies, wallet addresses or unrelated private user data.
- Actual uploader reviews the [altered/synthetic media rule](https://support.google.com/youtube/answer/14328491).
  Realistic synthetic people/voices/scenes can require disclosure; do not hide
  synthetic endorsement or claim a human testimonial.
- Upload unlisted first with authorized channel access; check captions, chapters,
  links, rights and visibility. Publish only after review. Record actual video URL.

## RU / UZ localization

RU title: **Telegram Stars API: Python/Node SDK без реальной покупки**.
Opening: “Независимый проект, не официальный продукт Telegram/Fragment/TON.
Все платежи на экране — mocks. Запросы на покупку передают чувствительные credentials оператору API; после
таймаута покупку нельзя автоматически повторять.” Use the Russian docs link.

UZ title: **Telegram Stars API: Python/Node SDK, haqiqiy xaridsiz misol**.
Opening: “Mustaqil loyiha, Telegram/Fragment/TON rasmiy mahsuloti emas.
Ekrandagi to‘lovlar mock. Xarid so'rovlari sensitive credentiallarni API operatoriga uzatadi; timeoutdan keyin
xarid avtomatik takrorlanmaydi.” Use the Uzbek docs link. Translate narration
accurately after technical review; do not claim these language tracks are recorded.
