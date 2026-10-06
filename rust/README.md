# Fragment Donor Rust SDK

Independent, blocking server-side client. Not an official Telegram, Fragment
or TON product. Crate `fragment-donor-sdk`, initial version `0.1.0`.

## Install

After publication:

```toml
[dependencies]
fragment-donor-sdk = "0.1.0"
```

Before publication: use `fragment-donor-sdk = { path = "../rust" }`.
The source targets Rust 2021 with Rust 1.99+. The packaged lockfile fixes the
release dependency graph. Do not claim support for older runtimes without
testing that graph and updating the manifest requirement.

## All four operations

```rust,no_run
use fragment_donor_sdk::{Client, Config, Credentials, ErrorKind};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = Client::new(Config {
        credentials: Credentials {
            mnemonic: std::env::var("FRAGMENT_MNEMONIC")?,
            cookie: std::env::var("FRAGMENT_COOKIE")?,
            provider_key: std::env::var("TONCONSOLE_API_KEY").unwrap_or_default(),
            ..Credentials::default()
        },
        ..Config::default()
    })?;
    let user = client.get_user_info("durov")?;
    let balance = client.wallet_balance()?;
    let _ = (user, balance.ton, balance.usdt_ton); // exact decimal strings

    // Real-funds operations require both opt-in and one selected purchase.
    if std::env::var("FRAGMENT_ALLOW_PURCHASES").as_deref() != Ok("yes") {
        return Ok(());
    }
    let result = match std::env::var("FRAGMENT_PURCHASE_KIND").as_deref() {
        Ok("stars") => client.buy_stars("durov", 50, Some("usdt_ton")),
        Ok("premium") => client.buy_premium("durov", 3, Some("ton")),
        _ => return Ok(()),
    };
    match result {
        Err(error) if error.kind == ErrorKind::PurchaseOutcomeUnknown || error.outcome_unknown => {
            let _ = error.details.get("tx_hash"); // reconcile manually; no replay
        }
        result => { let _ = result?; }
    }
    Ok(())
}
```

No service account, `Authorization` or `X-Api-Key` exists in this SDK. `Api-Key`
is an optional TonConsole provider key. Cookie/Mnemonic are wallet/session
credentials for purchases; balance only needs Mnemonic. Four endpoints share
a normally 30/minute per-IP limit. Requests are form encoded, not JSON.
Stars range: 50–1,000,000. Premium: 3/6/12 months. Payment methods: `usdt_ton`
(default when None) and `ton`. Credentials support `wallet_version` (`auto`,
`v5r1`, `v4r2`, `v3r2`), `wallet_address`, Fragment `proxy`, `user_agent`.
The backend accepts POST for balance too; SDK uses GET.

`ErrorKind` distinguishes Validation, Api, RateLimit, Unavailable, Timeout,
Network and MalformedResponse. Errors expose safe `message`, HTTP `status`,
`code` and `retry_after: Option<Duration>`. Retry hints support header seconds,
HTTP date, JSON `retry_after`/`flood_wait`, choosing the longest valid hint.
Raw transport errors/request objects are not included in Error/debug output.
`Error.details` retains recursively redacted JSON error fields including
`info`, `tx_hash`, `unconfirmed`, `transient` and future fields for reconciliation.
`unconfirmed: true` on a purchase produces `ErrorKind::PurchaseOutcomeUnknown`
with `outcome_unknown: true`, even for HTTP 400. Purchase transport/malformed
failures, redirects and ambiguous 5xx also set that flag. Known pre-purchase
limiter codes retain RateLimit/Unavailable. Reconcile `details["tx_hash"]`
manually; never replay the purchase. A false flag is not a rejection or
idempotency guarantee. Remote HTTP 400/422 failures are Api; Validation is
reserved for SDK preflight validation.

Default retries: zero. `Config { read_retries: 2, automatic_wait: true, .. }`
opts read-only requests into bounded retries. Maximum wait is 60 seconds;
longer waits return the error without retrying early. **Purchases never retry**
on 429, 503, 5xx, transport failure or malformed responses. The backend has no
idempotency guarantee. Redirects are disabled. This blocking client should run
outside async executor threads (or in a dedicated blocking worker).

Typed responses preserve unknown fields in `extra`. Balances stay strings;
serde_json's arbitrary_precision retains unknown JSON numbers as well.
Client/Config/Credentials/TransportRequest debug is redacted. Do not log
custom transport internals. A custom `Transport` must not retry requests,
redirect them or expose credentials. Purchase requests transmit the wallet
mnemonic and Fragment session/cookie to the API operator. SDK redaction applies
to client-side diagnostics only. Use server-side secret storage and a dedicated,
minimally funded wallet.

## Development and release

In a full checkout (tests consume the common synthetic contract fixture):

```sh
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test --locked
cargo build --locked
cargo package --list
cargo package --locked
python smoke/verify.py
cargo publish --dry-run --locked
```

`smoke/verify.py` checks the built `.crate` allowlist and fixture/private-key
exclusion, then extracts that artifact into a fresh offline Cargo consumer.
Its mock transport exercises all four methods, exact balance preservation,
unconfirmed Stars/Premium classification, redacted details and no duplicates.
It does not claim crates.io installation. `CARGO_TARGET_DIR` is supported.
Inspect crate contents and perform secret scanning before a separate registry
release. Never use actual credentials or real purchases for tests. Verify
crates.io ownership/access and MFA/trusted publishing before `cargo publish`;
building a crate does not mean it is published. After publication, verify a
fresh consumer can install/build version `0.1.0` from the registry.

[Docs](https://usnuz.github.io/fragment-donor-sdk/)
· [Source](https://github.com/usnuz/fragment-donor-sdk/tree/main/rust)
· [Changelog](CHANGELOG.md) · [MIT license](LICENSE)
