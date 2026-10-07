# LinkedIn Articles publication payload

Status: AI-generated draft; human editorial review pending; publication NOT_RUN.
Eligible publication is authorized; account/editorial gates remain.
Title: **Payment integrations need an unknown-outcome state**.
Audience: backend leads and engineering managers. Tags: API, Backend, SDK.

## Copy

Disclosure: AI generated this draft for the Fragment Donor project; human review
is pending. Independent
service, not an official Telegram, Fragment or TON product. No real payment or
production incident is claimed in this article.

A useful review question for a payment integration is: “What state do we store
when the request times out after dispatch?” If the answer is simply “failed, so
retry,” the application may repeat a payment that already happened.

Our independent SDK project makes this boundary explicit across seven languages.
Username and balance reads may opt into bounded retries. Stars and Premium
purchase POSTs never automatically retry, even on timeout, 429, 503 or malformed
response. The backend has no idempotency guarantee or purchase-status endpoint.
A local application intent can serialize dispatch, but cannot retroactively make
the remote purchase exactly-once.

A better operational state is reconciliation-required. Preserve the approved
recipient/amount and safe transaction reference if supplied, examine wallet and
recipient evidence, and make any subsequent purchase an explicit decision. Keep
credentials out of application state logs and incident attachments. Test the
state machine with an injected timeout, asserting one outbound POST. Include
HTTP 400 `unconfirmed:true` with a transaction hash: that is unknown-outcome
evidence, not an ordinary validation rejection or permission to resend.

Two other review points deserve equal attention. First, “no service authentication”
doesn't mean “no wallet credential”: the direct API has no service account/key,
but balance reads use a mnemonic and purchases also use a sensitive session
cookie; optional Api-Key configures
TonConsole only. Second, purchase requests transmit wallet mnemonic and Fragment
session/cookie data to the API operator. Use trusted server storage.

The source includes mocked contract tests and EN/RU/UZ docs. These are evidence
of client behavior, not proof of successful blockchain delivery, independent
security certification or zero operational risk. Verify actual runtime/build and
registry state separately before deploying a consumer.

Source: https://github.com/usnuz/fragment-donor-sdk.
Errors/reconciliation: https://usnuz.github.io/fragment-donor-sdk/en/guides/errors/.
Documentation: https://usnuz.github.io/fragment-donor-sdk/en/.

## Posting gates

Use the actual affiliated author's account, preserve AI assistance disclosure,
and check [professional rules](https://www.linkedin.com/legal/professional-community-policies).
No mass tagging, unsolicited DM, fake endorsements or engagement manipulation.
This is an original article; no invented crosspost canonical is supplied.
