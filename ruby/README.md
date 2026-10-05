# Fragment Donor Ruby SDK

Independent server-side Ruby 3.2+ client. Not an official Telegram, Fragment or
TON product. Initial gem `fragment-donor-sdk` version `0.1.0`.

## Install

After publication: `gem install fragment-donor-sdk -v 0.1.0`.
Before publication: `gem build fragment-donor-sdk.gemspec`, then
`gem install --local fragment-donor-sdk-0.1.0.gem`.

## All four operations

```ruby
require "fragment_donor_sdk"

client = FragmentDonor::Client.new(
  credentials: FragmentDonor::Credentials.new(
    mnemonic: ENV.fetch("FRAGMENT_MNEMONIC"),
    cookie: ENV.fetch("FRAGMENT_COOKIE"),
    wallet_version: "auto",
    provider_key: ENV["TONCONSOLE_API_KEY"] # optional provider key only
  ),
  connect_timeout: 5,
  request_timeout: 30
)
user = client.get_user_info("durov")
balance = client.wallet_balance
# Exact strings; do not convert to Float.
puts balance.ton

# Examples that spend real money: run only the operation you deliberately want.
stars = client.buy_stars("durov", 50, payment_method: "usdt_ton")
premium = client.buy_premium("durov", 3, payment_method: "ton")
```

No service account, login, `Authorization` or `X-Api-Key` is needed. Cookie and
Mnemonic are purchase credentials; balance needs only Mnemonic. `Api-Key` is
an optional TonConsole provider key. Stars: integer 50–1,000,000. Premium:
3/6/12 months. Payment: `usdt_ton` (backend default when omitted) or `ton`.
Wallet versions: `auto`, `v5r1`, `v4r2`, `v3r2`. Wallet address, Fragment Proxy
and User-Agent are optional Credentials fields. Purchases are form-encoded.
The backend accepts GET and POST for balance; this client chooses GET.

```ruby
begin
  user = client.get_user_info("durov")
rescue FragmentDonor::RateLimitError => error
  puts "Wait #{error.retry_after} seconds before your next request"
rescue FragmentDonor::UnavailableError => error
  puts "Temporarily unavailable; wait #{error.retry_after} seconds"
rescue FragmentDonor::TimeoutError, FragmentDonor::NetworkError
  # Purchase outcome may be unknown. Never blindly repeat a purchase.
rescue FragmentDonor::ValidationError, FragmentDonor::APIError,
       FragmentDonor::MalformedResponseError => error
  warn error.message # SDK messages redact configured credential values.
end
```

The shared per-IP limit is normally 30/minute. Retry hints understand HTTP
seconds, HTTP date, JSON `retry_after` and `flood_wait`. Default retry count is
zero. Opt-in `read_retries: 2, automatic_wait: true` allows read-only retries;
waits above `max_wait: 60` return immediately without retrying too early.
**Purchases always make one attempt**, even under opt-in retry configuration.
There is no backend idempotency guarantee. Redirects are not followed.
Injected transports must not retry or log credential-bearing requests.

Typed `UserInfo`, `Purchase`, `WalletBalance` preserve unknown fields in `extra`;
`ton`/`usdt_ton` are strings. Debug/JSON representations of Client/Credentials
are redacted and transport exception causes are discarded. Do not dump
arbitrary request or response internals. Use dedicated, minimally funded
wallets and server-side secret storage. The inspected backend stores submitted
credentials; do not claim zero retention.

## Tests/build/release

From this directory in the monorepo:

```sh
ruby -Ilib test/client_test.rb
gem build fragment-donor-sdk.gemspec
gem specification --local fragment-donor-sdk-0.1.0.gem files
gem install --local fragment-donor-sdk-0.1.0.gem
```

Tests consume `../contract/fixtures.json` with synthetic credentials, mocked
transport and no real purchases. Run a secret scan and inspect gem contents
before releasing. Publish only with verified RubyGems ownership/MFA or trusted
publishing. `gem push` is a separate authorized release action; a local gem
build is not a publication. Verify installation from RubyGems after publishing.

[Docs](https://usnuz.github.io/fragment-donor-sdk/)
· [Source](https://github.com/usnuz/fragment-donor-sdk/tree/main/ruby)
· [Changelog](CHANGELOG.md) · [MIT license](LICENSE)
