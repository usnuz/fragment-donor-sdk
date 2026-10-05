# DEV.to publication payload

Status: READY AI-generated draft; eligible publication authorized, actual
account/editorial checks and publication NOT_RUN.
Title: **Why payment POSTs must not auto-retry: a seven-SDK contract test**.
Tags: `api`, `python`, `typescript`, `security` (max four if editor requires).

## Copy

Disclosure: this article was generated with AI assistance for Fragment Donor.
Use DEV's truthful **Fully Autonomous** disclosure for this draft unless a human
has genuinely independently authored a replacement. Do not assert human review
that has not happened. Independent service, not an official Telegram/Fragment/TON
product. No real payment occurred in these tests.

The useful SDK behavior isn't just turning arguments into HTTP. It is refusing
to replay a spending POST when the reply is lost. A generic retry decorator can
hide that decision and accidentally convert a timeout into a second purchase.

Fragment Donor exposes two reads and two purchase operations. Its direct API has
no service account/API-key auth, but purchasing still needs sensitive Fragment
Cookie and wallet Mnemonic. Optional Api-Key is TonConsole provider configuration.
The backend stores submitted credentials; log redaction doesn't remove that
trust boundary or make the service non-custodial.

Python/Node clients default to zero retries. The following opt-in configuration
applies only to reads:

```python
from fragment_donor_sdk import FragmentDonorClient

client = FragmentDonorClient(
    readonly_retries=2, auto_wait=True, max_wait_seconds=60,
)
```

429 wait selection takes the longest valid Retry-After seconds/date or JSON hint.
If that hint exceeds the maximum, return the error rather than waking too early.
The usual quota is shared 30/minute/IP across all four endpoints.

Now test a timeout after dispatch with a mocked transport. The assertion should
be “one POST was sent,” not merely “a TransportError was raised.” Repeat for reset,
429, 503, 500 and malformed JSON. Include HTTP 400 `unconfirmed:true`/`tx_hash`:
this is an unknown payment outcome, not ordinary validation rejection. Preserve
the safe transaction reference for reconciliation, never automatic retry.
These tests exist in the public Python/Node
source. The shared fixture contains synthetic credentials and no real payment.

After an unknown purchase outcome, retain a reconciliation-required application
state, inspect wallet/recipient evidence, and make any new dispatch an explicit
operator decision. A local unique intent doesn't create server idempotency;
there is no backend purchase-status endpoint or idempotency-key guarantee here.
Inspect custom transports, reverse proxies and queues for hidden POST retries.

Source/tests: https://github.com/usnuz/fragment-donor-sdk.
Full wait guide: https://usnuz.github.io/fragment-donor-sdk/en/guides/rate-limit-flood-wait/.
Seven package builds exist independently of registry publication; check actual
status before installing a claimed release.

## Editor settings

Leave published false until author review. This is an original short article,
not a literal copy of content/06. Do not set its canonical to docs home. If a
literal original article is later crossposted, use its exact verified URL.
Recheck [DEV AI rules](https://dev.to/guidelines-for-ai-assisted-articles-on-dev/)
and actual disclosure controls. No mass series cloning or engagement manipulation.
