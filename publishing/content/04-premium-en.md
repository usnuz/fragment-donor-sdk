# Gift Telegram Premium API integration: validate first, dispatch once

Audience: gifting-service backend developers. Tags: `api`, `python`, `typescript`.
Status: READY draft. This is an AI-assisted independent-project tutorial, not an
official Telegram/Fragment/TON product or evidence of a real Premium gift.

## Article

Premium gifting uses `POST /buy-premium/`, with **form** fields `username`,
`duration` and optional `payment_method`. Duration is an integer of 3, 6 or 12
months, not a date, days count or string plan identifier. Payment is `usdt_ton`
(default) or `ton`. The recipient username has the same syntax as user lookup.

The direct service requires no login or service API key, but this spending
operation requires a Fragment `Cookie` and wallet `Mnemonic`. Optional `Api-Key`
is TonConsole provider configuration. Do not invent `Authorization` or an
`Idempotency-Key` header and claim it changes the backend's guarantees.

Python and Node clients expose the same operation idiomatically. Installation
instructions and actual publication status are in the source repository. The
calls below are intentionally **commented out**, not an executable payment demo:

```python
# Trusted server; credentials from deployment secret manager.
# result = client.buy_premium("durov", 3, payment_method="ton")
```

```typescript
// Trusted Node.js server, never a frontend bundle.
// const result = await client.buyPremium("durov", 3, { paymentMethod: "ton" });
```

A useful application design separates local intent from remote completion:

1. Record a local purchase intent with the approved recipient, duration and
   payment method. Serialize dispatch for that intent in your application.
2. Validate inputs before sending, and make one deliberate remote POST.
3. On success retain a safe transaction reference if supplied, not credentials.
4. On timeout/reset/5xx/malformed response mark the intent as requiring manual
   reconciliation. Do not mark it “definitely unpaid” and automatically resend.

An application intent ID prevents your own double-click logic from dispatching
twice, but it does **not** create remote idempotency. There is no backend purchase-
status endpoint in this contract. Check wallet transaction history and recipient
state before the operator decides whether a new purchase is justified.

The four endpoints share the usual 30/minute/IP limit. 429/503 wait hints should
be displayed or scheduled for read-only work; SDK purchase methods never auto-
retry them. A delivery claim in an article should be supported by an actual
deliberate authorized payment, and none is made here.

The inspected backend persists submitted credentials. Keep secrets on a trusted
server, use a dedicated minimally funded wallet and consider operator access.
Redirect refusal and log redaction are client controls, not zero-retention claims.

[Premium endpoint](https://usnuz.github.io/fragment-donor-sdk/en/reference/buy-premium/) ·
[SDK source](https://github.com/usnuz/fragment-donor-sdk) ·
[Error handling](https://usnuz.github.io/fragment-donor-sdk/en/guides/errors/).
