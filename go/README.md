# Fragment Donor Go SDK

Independent server-side SDK; not an official Telegram, Fragment or TON product.
Go 1.23+. Module `github.com/usnuz/fragment-donor-sdk/go`, version `0.1.2`.

## Installation

After publication:

```sh
go get github.com/usnuz/fragment-donor-sdk/go@v0.1.2
```

The monorepo release tag must be **`go/v0.1.2`**. Go modules are indexed through
the Go proxy/pkg.go.dev; there is no separate registry upload. Before publishing,
use this directory as a local module with a `replace` directive.

## All four endpoints

```go
package main

import (
    "context"
    "errors"
    "os"
    "time"
    donor "github.com/usnuz/fragment-donor-sdk/go"
)

func main() {
    client, err := donor.NewClient(donor.Config{
        BaseURL: donor.DefaultBaseURL,
        Timeout: 30 * time.Second,
        ConnectTimeout: 5 * time.Second,
        Credentials: donor.Credentials{
            Mnemonic: os.Getenv("FRAGMENT_MNEMONIC"),
            Cookie: os.Getenv("FRAGMENT_COOKIE"),
            WalletVersion: "auto", // auto, v5r1, v4r2, v3r2
            ProviderKey: os.Getenv("TONCONSOLE_API_KEY"), // optional provider key
        },
    })
    if err != nil { return }
    ctx := context.Background()
    user, err := client.GetUserInfo(ctx, "durov")
    _ = user
    if err != nil { return }
    balance, err := client.WalletBalance(ctx)
    _ = balance // TON and USDTTON are exact decimal strings.
    if err != nil { return }

    // Real-funds operations require both opt-in and one selected purchase.
    if os.Getenv("FRAGMENT_ALLOW_PURCHASES") != "yes" { return }
    switch os.Getenv("FRAGMENT_PURCHASE_KIND") {
    case "stars":
        _, err = client.BuyStars(ctx, "durov", 50, "usdt_ton")
    case "premium":
        _, err = client.BuyPremium(ctx, "durov", 3, "ton")
    default:
        return
    }
    var apiErr *donor.Error
    if errors.As(err, &apiErr) {
        if apiErr.OutcomeUnknown {
            _ = apiErr.Details["tx_hash"] // reconcile manually; do not repeat.
        }
        _ = apiErr.RetryAfter // communicate wait, never auto-replay purchase.
    }
}
```

No service account is needed. `Api-Key` is only an optional TonConsole provider
key. Purchase Cookie/Mnemonic are wallet and
Fragment session credentials. Wallet balance needs only Mnemonic, not Cookie;
the backend accepts GET and POST, and the SDK chooses GET. Requests use form
encoding, not JSON. Stars: 50–1,000,000; Premium: 3/6/12 months;
payment method: `usdt_ton` (server default when `""`) or `ton`.

All endpoints share a normally 30/minute per-IP limit. 429 exposes `RetryAfter`
from header seconds/HTTP date and JSON `retry_after`/`flood_wait`; 503 is
`UnavailableError`. `Error.Kind` also distinguishes validation, API,
timeout/network and malformed response failures. There are no raw transport
errors or credential-bearing request dumps in SDK errors.
`Error.Details` preserves recursively redacted JSON error fields, including
`info`, `tx_hash`, `unconfirmed` and `transient`, for manual reconciliation.
An explicit purchase `unconfirmed: true` raises `PurchaseOutcomeUnknownError`,
not validation or a safe rejection. `Error.OutcomeUnknown` is also true after
purchase timeouts, network/malformed replies, redirects and ambiguous 5xx.
The known pre-purchase limiter codes retain their rate/unavailable errors.
Never replay a purchase; reconcile its redacted `tx_hash` manually. A false
flag is not an idempotency/rejection guarantee. Remote HTTP 400/422 failures
are `APIError`; `ValidationError` denotes SDK preflight validation only.

Default retries: zero. Set `ReadRetries: 2, AutomaticWait: true` to allow bounded
read-only retries with waits of at most 60 seconds. Longer server waits return
the error without retrying early. **Purchases never retry**, even with that
configuration, 429, 503, timeout, connection reset or invalid JSON. No
idempotency guarantee exists. Redirects are refused. A custom RoundTripper is
responsible for not performing its own hidden retries/logging.

Unknown response fields remain in `Extra`; purchase `Data` is raw JSON.
Do not convert balance strings to float64. Config/credentials debug and JSON
representations are redacted, but never log arbitrary request/response objects.

Purchase requests transmit the wallet mnemonic and Fragment session/cookie to
the API operator. Keep real credentials out
of examples, screenshots and CI.

## Development and release

From this directory in a checkout including `../contract/fixtures.json`:

```sh
sh scripts/check.sh
```

Tests use the shared synthetic contract and mocked transport/local HTTP. They
never buy Stars/Premium or call the production API.
`scripts/check.sh` enforces gofmt, tests, vet/build and runs `go run ./scripts`:
an allowlisted source ZIP is extracted into a fresh offline consumer module,
which exercises all four methods, unknown purchase outcomes and redaction.
This source smoke does not verify a public Go version/tag/proxy installation.
Inspect tracked module contents and run a secret scan before tagging. Tag
`go/v0.1.2` only after the
clean public monorepo is released. After publishing, verify installation from
an empty consumer module and inspect pkg.go.dev visibility separately.

[Documentation](https://usnuz.github.io/fragment-donor-sdk/)
· [Source](https://github.com/usnuz/fragment-donor-sdk/tree/main/go)
· [Changelog](CHANGELOG.md) · [MIT license](LICENSE)
