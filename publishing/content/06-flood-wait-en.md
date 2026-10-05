# Telegram Stars API 429 Retry-After: retry reads, reconcile payments

Audience: SDK/HTTP engineers. Tags: `api`, `python`, `typescript`, `testing`.
Status: READY AI-assisted technical draft; no public post or real purchase.
Independent Fragment Donor project, not an official Telegram, Fragment or TON SDK.

## Article

HTTP 429 is a scheduling signal, not permission to resend every request. Fragment
Donor shares a normally 30-request/IP/minute limit across username lookup,
balance, Stars purchase and Premium purchase. A typical synthetic rate-limit
reply is:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 12
Content-Type: application/json

{"ok":false,"error":"FLOOD_WAIT","retry_after":12,"flood_wait":12}
```

These values are illustrative fixtures, not a measured live response or an
unchangeable production quota. The SDK reads header seconds, HTTP-date and JSON
`retry_after`/`flood_wait`, choosing the longest valid hint if they conflict. A
503 `RATE_LIMIT_UNAVAILABLE` also exposes its hint (the inspected backend uses
five seconds when limiter infrastructure is unavailable).

Defaults are deliberately quiet: zero retries and no automatic sleep. You can
show the wait to an operator instead of blocking a worker:

```python
from fragment_donor_sdk import FloodWaitError, FragmentDonorClient

try:
    FragmentDonorClient(timeout=30).get_user_info("durov")
except FloodWaitError as error:
    print("Schedule this read no sooner than", error.retry_after, "seconds")
```

Bounded waiting is an explicit read-only policy:

```python
client = FragmentDonorClient(
    readonly_retries=2, auto_wait=True, max_wait_seconds=60,
)
# client.get_user_info("durov") or client.wallet_balance()
```

```typescript
const client = new FragmentDonorClient({
  readonlyRetries: 2, autoWait: true, maxWaitSeconds: 60,
});
```

If the server says to wait 120 seconds but your maximum is 60, the SDK raises the
error; it does not wait 60 and retry too early. The limit is a ceiling on client
waiting, not permission to shorten the server's interval. At most two additional
read requests occur, not an unbounded loop.

For `buy_stars`/`buy_premium`, automatic retry is always zero, even with those
options. A timeout, connection reset, 5xx or malformed JSON can follow a completed
wallet transaction. HTTP 400 with `unconfirmed:true` and `tx_hash` is also an
unknown payment outcome, not ordinary validation rejection. Keep the safe
transaction reference; an error status alone does not prove funds were unspent.
There is no idempotency guarantee or purchase-status endpoint.
Record “outcome unknown,” examine wallet/recipient evidence, and let the operator
decide on a new intentional purchase. Configure any proxy, job queue and custom
transport so they do not invisibly retry POSTs behind the SDK's back.

Tests should assert request counts, not merely exception types: inject one 503 or
timeout and verify exactly one purchase POST. Separately test three attempted
read requests under the two-retry ceiling, contradictory wait hints, HTTP-date,
and a hint above the maximum. The shared fixture tests use synthetic credentials
and no real wallet funds.

No service auth is needed; wallet Cookie/Mnemonic still are. The optional provider
key is not service login. The inspected backend stores submitted credentials, so
safe retry logic and SDK log redaction do not make the service non-custodial.

[Rate-limit guide](https://usnuz.github.io/fragment-donor-sdk/en/guides/rate-limit-flood-wait/) ·
[Python request-count tests](https://github.com/usnuz/fragment-donor-sdk/blob/main/python/tests/test_client.py) ·
[Node tests](https://github.com/usnuz/fragment-donor-sdk/blob/main/typescript/test/client.test.mjs).
