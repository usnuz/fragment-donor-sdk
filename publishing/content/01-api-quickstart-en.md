# Telegram Stars gifting API: a four-operation quick start

Audience: backend developers. Tags: `api`, `telegram`, `sdk`, `security`.
Format: standalone technical tutorial. Status: READY draft, not published.
Canonical: unset until an original article is actually published.

## Article

Disclosure: this draft was prepared with AI assistance for the Fragment Donor
project. Fragment Donor is an independent service, not an official Telegram,
Fragment, or TON product. No actual payment is demonstrated here.

The first distinction in a Telegram Stars API integration is between service
authentication and wallet access. `https://fragment.donor.uz` does not require a
service account or login. That does **not** mean a
purchase needs no credentials: purchases use your Fragment session cookie and
wallet mnemonic. Optional `Api-Key` configures a TonConsole provider, not access
to this service.

Start with one read-only username request:

```sh
curl --max-time 30 --get 'https://fragment.donor.uz/get-user-info/' \
  --data-urlencode 'username=durov'
```

The username must be an optional `@`, an ASCII letter and 3–31 further ASCII
letters, digits or underscores. A lookup is not proof that a later gift will
succeed, and the example does not imply any relationship with that account.

| Operation | Wire format | Required credentials |
| --- | --- | --- |
| `GET /get-user-info/` | `username` query | none |
| `POST /buy-stars/` | form `username`, integer `amount` | Mnemonic + Cookie |
| `POST /buy-premium/` | form `username`, integer `duration` | Mnemonic + Cookie |
| `GET /wallet-balance/` | no body | Mnemonic |

The backend also accepts POST for balance; each SDK documents its chosen method.
Purchase requests are `application/x-www-form-urlencoded`, not JSON. Stars
amounts are 50–1,000,000; Premium durations are 3, 6 or 12 months. Payment methods
are `usdt_ton` (default) or `ton`. Wallet versions are `auto`, `v5r1`, `v4r2`,
`v3r2`; a mnemonic has 12, 18 or 24 words, though word count alone proves neither
validity nor funds.

Keep the first integration entirely read-only. Then test purchases through an
injected mocked transport using the shared synthetic fixtures, including a
timeout after dispatch. Do not spend real wallet funds to test SDK packaging.

All four operations share a normally 30-request/IP/minute window. A 429 contains
`FLOOD_WAIT`, `Retry-After` and JSON wait hints; a 503 provides a retry hint.
Automatic waits and retries default to off. Read-only retries can be explicitly
bounded, but a payment POST must never be automatically repeated, even after a
timeout or 5xx. The first attempt may have spent funds; no backend idempotency
key or purchase-status endpoint resolves that ambiguity. HTTP 400 with
`unconfirmed:true`/`tx_hash` can also follow payment dispatch: preserve the safe
reference and reconcile, rather than treating it as ordinary validation rejection.

The trust boundary is important: purchase requests transmit wallet mnemonic and
Fragment session/cookie data to the API operator;
never put seeds into frontend code or public
collection variables.

[Telegram Stars API guide](https://usnuz.github.io/fragment-donor-sdk/en/guides/telegram-stars-api/) ·
[Source and release status](https://github.com/usnuz/fragment-donor-sdk) ·
[Credential guide](https://usnuz.github.io/fragment-donor-sdk/en/guides/credentials/).
