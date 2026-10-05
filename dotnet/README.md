# Fragment Donor .NET SDK

Independent .NET 8+ server-side client, version `0.1.0`, with no external runtime
packages. Not affiliated with Telegram, Fragment or TON. Package name remains
provisional until registry availability and publisher access are verified.

```sh
dotnet add package FragmentDonor.Sdk --version 0.1.0
```

[Source](https://github.com/usnuz/fragment-donor-sdk) ·
[English docs](https://usnuz.github.io/fragment-donor-sdk/en/) ·
[Русский](https://usnuz.github.io/fragment-donor-sdk/ru/) ·
[O‘zbekcha](https://usnuz.github.io/fragment-donor-sdk/uz/)

## All four operations

No account, login, `Authorization` or `X-Api-Key` is needed. The optional `Api-Key`
is a TonConsole provider key. Cookie and mnemonic are sensitive wallet/session
credentials for your own purchases; they are not a service login.

```csharp
using FragmentDonor.Sdk;

var credentials = new WalletCredentials(
    Environment.GetEnvironmentVariable("FRAGMENT_MNEMONIC") ?? "",
    Environment.GetEnvironmentVariable("FRAGMENT_COOKIE"))
{
    ProviderKey = Environment.GetEnvironmentVariable("TONCONSOLE_API_KEY"),
    WalletVersion = "auto",
};
using var client = new FragmentDonorClient(new ClientOptions { Credentials = credentials });
var user = await client.GetUserInfoAsync("durov");
var wallet = await client.WalletBalanceAsync(); // GET; usePost: true also supported
Console.WriteLine(wallet.Ton); // Decimal string, never convert to double.

// The following calls spend wallet funds. Run only for an intended purchase.
var stars = await client.BuyStarsAsync(new StarsRequest("durov", 50, "usdt_ton"));
var premium = await client.BuyPremiumAsync(new PremiumRequest("durov", 3, "ton"));
```

Stars: `50..1000000`. Premium: `3/6/12` months. Payment methods: `usdt_ton`
(default), `ton`. Wallet versions: `auto/v5r1/v4r2/v3r2`. Username: optional `@`,
letter, then 3..31 letters/digits/underscores. The backend validates 12/18/24-word
TON/BIP39 seeds. Optional `WalletAddress`, purchase-only `Proxy` and `UserAgent`
map to backend headers. Purchase bodies are form-urlencoded. Response `Raw`
contains all server fields, including future fields; balance values stay strings.

## Typed errors and flood wait

```csharp
try { await client.BuyStarsAsync(new StarsRequest("durov", 50)); }
catch (RateLimitException e) { Console.WriteLine($"Wait {e.RetryAfter} seconds."); }
catch (ServiceUnavailableException e) { Console.WriteLine($"Unavailable; hint {e.RetryAfter}s."); }
catch (TransportTimeoutException)
{
    // Completion may be unknown. Reconcile the purchase before another submission.
}
catch (SdkException e)
{
    // ValidationException, ApiException, TransportException, MalformedResponseException.
    // Typed StatusCode/ErrorCode/ResponseData are safe-redacted; never log credentials.
}
```

The default shared IP limit is 30 requests/minute. RetryAfter considers seconds,
HTTP dates, JSON `retry_after` and `flood_wait`, choosing the largest valid hint.
Default connect timeout: 10 seconds; total request timeout: 60 seconds. Cancellation
tokens are supported. Zero automatic retries by default. Read-only retries can be
enabled with `ReadOnlyRetries = 2, AutoWaitFlood = true, MaxWaitSeconds = 60`.
Max 2 retries, max wait 60s; 429 never waits unless explicitly opted in.
Purchases never retry on any error, including 429/503/timeouts/5xx, because no
backend idempotency guarantee exists. SDK-owned HTTP handlers disable redirects
and cookie jars. Injected HttpMessageHandlers must not enable redirects, hidden
retries or sensitive logging. Dispose the client when done; it owns its handler.
Original transport exception messages and chains are discarded to prevent leaks.

The inspected backend stores submitted wallet/session/provider/proxy credentials
in its database. SDK redaction does not prevent backend retention. Use a dedicated
minimally funded wallet and secret manager; do not claim non-custodial or
zero-retention behavior or expose seeds in frontend code.

## Build, test and release

From `dotnet/`:

```sh
dotnet build src/FragmentDonor.Sdk -c Release
dotnet run --project tests/FragmentDonor.Sdk.Tests -c Release
dotnet pack src/FragmentDonor.Sdk -c Release -o dist
dotnet restore tests/PackageSmoke --source dist --configfile NuGet.Config
dotnet run --project tests/PackageSmoke -c Release --no-restore
```

The dependency-free executable test runner consumes `../contract/fixtures.json`
and tests injected deterministic handlers without real purchases. Its nonzero exit
code fails CI. The PackageSmoke executable installs the built local nupkg rather
than referencing SDK source. Inspect nupkg contents before `dotnet nuget push`.
Use repository NuGet trusted publishing where available
or the registry credential stored as a protected CI secret; never put it in source.
