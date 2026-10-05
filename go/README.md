# Fragment Donor Go SDK

Independent server-side SDK; not an official Telegram, Fragment or TON product.
Go 1.23+. Module `github.com/usnuz/fragment-donor-sdk/go`, initial version `0.1.0`.

## Installation

After publication:

```sh
go get github.com/usnuz/fragment-donor-sdk/go@v0.1.0
```

The monorepo release tag must be **`go/v0.1.0`**. Go modules are indexed through
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

    // These two calls spend real wallet funds. Select one deliberately;
    // they are examples, not a safe production smoke test.
    stars, err := client.BuyStars(ctx, "durov", 50, "usdt_ton")
    _ = stars
    var apiErr *donor.Error
    if errors.As(err, &apiErr) && apiErr.Kind == donor.RateLimitError {
        _ = apiErr.RetryAfter // communicate wait; never blindly repeat purchase.
    }
    premium, err := client.BuyPremium(ctx, "durov", 3, "ton")
    _, _ = premium, err
}
```

No service account, `Authorization` or `X-Api-Key` is needed. `Api-Key` is only
an optional TonConsole provider key. Purchase Cookie/Mnemonic are wallet and
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

Default retries: zero. Set `ReadRetries: 2, AutomaticWait: true` to allow bounded
read-only retries with waits of at most 60 seconds. Longer server waits return
the error without retrying early. **Purchases never retry**, even with that
configuration, 429, 503, timeout, connection reset or invalid JSON. No
idempotency guarantee exists. Redirects are refused. A custom RoundTripper is
responsible for not performing its own hidden retries/logging.

Unknown response fields remain in `Extra`; purchase `Data` is raw JSON.
Do not convert balance strings to float64. Config/credentials debug and JSON
representations are redacted, but never log arbitrary request/response objects.

Use server-side secret storage and a dedicated minimally funded wallet. The
inspected backend **stores submitted wallet credentials**; SDK redaction does
not mean that the operator cannot access them. No real credential belongs in
examples, screenshots or CI.

## Development and release

From this directory in a checkout including `../contract/fixtures.json`:

```sh
gofmt -w client.go client_test.go
go vet ./...
go test ./...
go build ./...
```

Tests use the shared synthetic contract and mocked transport/local HTTP. They
never buy Stars/Premium or call the production API. Inspect tracked module
contents and run a secret scan before tagging. Tag `go/v0.1.0` only after the
clean public monorepo is released. After publishing, verify installation from
an empty consumer module and inspect pkg.go.dev visibility separately.

[Documentation](https://usnuz.github.io/fragment-donor-sdk/)
· [Source](https://github.com/usnuz/fragment-donor-sdk/tree/main/go)
· [Changelog](CHANGELOG.md) · [MIT license](LICENSE)
