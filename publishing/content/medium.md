# Medium publication payload

Status: PUBLISHED AI-assisted article; owner-reviewed public copy was reconciled
to neutral credential-transmission wording on 2026-10-07. Format: public **non-paywalled**
engineering article. Title: **No service auth is not no wallet risk**.
Topics: Software Engineering, APIs, Security.

## Copy

Disclosure: this draft was generated with AI for Fragment Donor and still needs
human editorial review.
Fragment Donor is independent, not an official Telegram, Fragment or TON product.
This is a mock/source walkthrough, not a customer testimonial or real purchase.

“No auth” is an overloaded phrase. It may mean you don't need to create a service
account, but it says nothing about what secrets an operation needs or where they
are transmitted. In this API, a username lookup requires no credential,
while a Stars/Premium purchase uses a wallet mnemonic and Fragment session cookie.
An optional `Api-Key` is a TonConsole provider key only.

The SDK boundary and server boundary are separate. A client can use redacted
diagnostics, disable redirect forwarding and avoid leaking transport causes.
Purchase requests still transmit wallet mnemonic and Fragment session/cookie data
to the API operator. SDK redaction applies to client-side diagnostics only.

Payment retry is another boundary. A timeout can occur after remote payment
completion. Without a backend idempotency guarantee or purchase-status endpoint,
the application should mark the result unknown and reconcile wallet/recipient
evidence before any new intentional dispatch. A generic network-retry loop may
silently double spend; a local database intent alone doesn't change remote rules.
Even HTTP 400 can be uncertain: `unconfirmed:true` with `tx_hash` is a
reconciliation signal, not proof of validation rejection or unspent funds.

Fragment Donor's seven SDKs make those limitations explicit. Purchases never
automatically retry; reads can opt into at most two bounded retries and 60 seconds
per wait. 429 supports Retry-After seconds/date and JSON hints under a normally
shared 30/minute/IP quota. The longest valid hint wins and isn't shortened to fit
a maximum. Balances remain decimal strings, not binary floats.

For evaluation, run deterministic source tests with synthetic credentials. Assert
one purchase POST after a timeout and inspect credential echo redaction. Do not
demonstrate a purchase using a real seed, browser storage or a publicly shared
Postman environment. Native build success, registry publication and blockchain
payment success are separate facts; this article doesn't merge them.

Source: https://github.com/usnuz/fragment-donor-sdk.
Docs: https://usnuz.github.io/fragment-donor-sdk/en/.
Security boundary: https://usnuz.github.io/fragment-donor-sdk/en/guides/credentials/.

## Publication gates

The [AI policy](https://help.medium.com/hc/en-us/articles/22576852947223-Artificial-Intelligence-AI-content-policy)
requires disclosure. This generated article stays outside Partner Program/paywall
earnings under [eligibility rules](https://help.medium.com/hc/en-us/articles/31090080813591-Content-eligible-for-the-paywall-policy).
No Boost/distribution/earnings claim. It is an original article; if later literally
crossposted, configure the exact original article URL, not a documentation homepage.
