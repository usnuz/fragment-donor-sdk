# Seven Fragment Donor SDKs: choose your backend, not a new trust model

Audience: integration teams. Tags: `sdk`, `api`, `opensource`.
Status: READY AI-assisted comparison. All proposed versions are 0.1.0; registry
commands below apply **only after an actual registry release**. Current state is
[recorded here](https://github.com/usnuz/fragment-donor-sdk/blob/main/publishing/publication-status.json).

## Article

Fragment Donor maintains seven idiomatic SDKs for the same four-operation HTTP
contract. This is an independent project, not an official Telegram, Fragment or
TON product. Choosing a language does not change the service's trust boundary:
Purchase requests transmit wallet mnemonic and Fragment session/cookie data to the API operator.

| Runtime | Package / version | Installation after publication | Example/source |
| --- | --- | --- | --- |
| Python 3.10+ | `fragment-donor-sdk` 0.1.0 | `python -m pip install fragment-donor-sdk==0.1.0` | [Python](https://github.com/usnuz/fragment-donor-sdk/tree/main/python) |
| Node 20+ / TypeScript | `fragment-donor-sdk` 0.1.0 | `npm install fragment-donor-sdk@0.1.0` | [Node](https://github.com/usnuz/fragment-donor-sdk/tree/main/typescript) |
| PHP 8.2+ + cURL | `fragment-donor/sdk` 0.1.0 | `composer require fragment-donor/sdk:^0.1` | [PHP](https://github.com/usnuz/fragment-donor-sdk/tree/main/php) |
| .NET 8+ | `FragmentDonor.Sdk` 0.1.0 | `dotnet add package FragmentDonor.Sdk --version 0.1.0` | [.NET](https://github.com/usnuz/fragment-donor-sdk/tree/main/dotnet) |
| Go 1.23+ | `github.com/usnuz/fragment-donor-sdk/go` v0.1.0 | `go get github.com/usnuz/fragment-donor-sdk/go@v0.1.0` | [Go](https://github.com/usnuz/fragment-donor-sdk/tree/main/go) |
| Rust 1.99+ | `fragment-donor-sdk` 0.1.0 | `cargo add fragment-donor-sdk@0.1.0` | [Rust](https://github.com/usnuz/fragment-donor-sdk/tree/main/rust) |
| Ruby 3.2+ | `fragment-donor-sdk` 0.1.0 | `gem install fragment-donor-sdk -v 0.1.0` | [Ruby](https://github.com/usnuz/fragment-donor-sdk/tree/main/ruby) |

Before publication, build/install from these source directories or the reviewed
local wheel, tarball, Composer archive, nupkg, crate and gem. A successful local
artifact install is not proof that the registry has a version. Go additionally
needs the module-subdirectory tag `go/v0.1.0`, not just a root release tag.

| Operation | Python | Node | PHP | .NET | Go | Rust | Ruby |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Username | `get_user_info` | `getUserInfo` | `getUserInfo` | `GetUserInfoAsync` | `GetUserInfo` | `get_user_info` | `get_user_info` |
| Stars | `buy_stars` | `buyStars` | `buyStars` | `BuyStarsAsync` | `BuyStars` | `buy_stars` | `buy_stars` |
| Premium | `buy_premium` | `buyPremium` | `buyPremium` | `BuyPremiumAsync` | `BuyPremium` | `buy_premium` | `buy_premium` |
| Balance | `wallet_balance` | `walletBalance` | `walletBalance` | `WalletBalanceAsync` | `WalletBalance` | `wallet_balance` | `wallet_balance` |

The source links include all four request examples and language-native error
handling. Python is synchronous; Node/.NET expose asynchronous operations; Go
uses context; PHP/Ruby/Rust use their runtime-native clients. Node purchase usage
is server-only, not a browser plugin. Choose the runtime your trusted backend
already supports rather than adding a new credential-bearing service solely for
an SDK wrapper.

Common behavior matters more than naming: form-urlencoded purchases; exact
decimal balance strings; retained unknown response fields; no service account,
service login; optional TonConsole provider key; redirect refusal;
structured errors; default zero retries; opt-in bounded read-only waits; and
**never** automatic purchase retries. HTTP 400 `unconfirmed:true` is a payment
outcome requiring reconciliation, not ordinary validation rejection; retain a
safe transaction reference if supplied. The usual quota is shared 30/minute/IP.

Every language is tested against common synthetic fixtures and mocked transport.
Native test/build status must be read separately for each runtime; code existing
in a repository is not proof of a passing compiler or package publication. No
real Stars or Premium purchase is needed for those checks.

Purchase requests transmit wallet mnemonic and Fragment session/cookie data to
the API operator. Keep secrets server-side. The docs provide
the same topics at separate English, Russian and Uzbek URLs without promising
search engine rankings.

[SDK guide](https://github.com/usnuz/fragment-donor-sdk/blob/main/docs/SDK_GUIDE.md) ·
[EN docs](https://usnuz.github.io/fragment-donor-sdk/en/) ·
[RU](https://usnuz.github.io/fragment-donor-sdk/ru/) ·
[UZ](https://usnuz.github.io/fragment-donor-sdk/uz/).
