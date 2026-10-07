# Fragment Donor .NET SDK

Independent .NET 8+ server-side client, version `0.1.3`, with no external runtime
packages. Not affiliated with Telegram, Fragment or TON.

Install the published package:

```sh
dotnet add package FragmentDonor.Sdk --version 0.1.3
```

[Source](https://github.com/usnuz/fragment-donor-sdk) ·
[English docs](https://usnuz.github.io/fragment-donor-sdk/en/) ·
[Русский](https://usnuz.github.io/fragment-donor-sdk/ru/) ·
[O‘zbekcha](https://usnuz.github.io/fragment-donor-sdk/uz/)

## All four operations

No account or login is needed. The optional `Api-Key` is a TonConsole provider
key. Cookie and mnemonic are sensitive wallet/session
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

// Purchase calls are intentionally commented: do not spend by copying this snippet.
// For an intended purchase select exactly ONE gift with the guarded QuickStart.
// var stars = await client.BuyStarsAsync(new StarsRequest("durov", 50, "usdt_ton"));
// var premium = await client.BuyPremiumAsync(new PremiumRequest("durov", 3, "ton"));
```

The executable [QuickStart](https://github.com/usnuz/fragment-donor-sdk/blob/main/dotnet/examples/QuickStart/Program.cs)
is read-only by default. One intended gift requires **both**
`FRAGMENT_ALLOW_PURCHASES=yes` and `FRAGMENT_PURCHASE_KIND=stars` **or** `premium`;
the selected kind sends at most one purchase, not both. Keep these flags unset in
CI and packaging/documentation tests. Never fund a wallet just to test an example.

Stars: `50..1000000`. Premium: `3/6/12` months. Payment methods: `usdt_ton`
(default), `ton`. Wallet versions: `auto/v5r1/v4r2/v3r2`. Username: optional `@`,
letter, then 3..31 letters/digits/underscores. The backend validates 12/18/24-word
TON/BIP39 seeds. Optional `WalletAddress`, purchase-only `Proxy` and `UserAgent`
map to backend headers. Purchase bodies are form-urlencoded. Response `Raw`
contains all server fields, including future fields; balance values stay strings.

## Typed errors and flood wait

```csharp
// Error-handling skeleton only: no payment is initiated by copying it.
// Place it around ONE intentionally approved, opt-in guarded purchase.
try { /* No HTTP request by default. */ }
catch (PurchaseOutcomeUnknownException e)
{
    // HTTP400 + unconfirmed:true is not validation or proof of no payment.
    e.ResponseData.TryGetValue("tx_hash", out var txHash); // optional reconciliation evidence
    // Persist a reconciliation-required state; do not dispatch another purchase.
}
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

`SdkException.PurchaseOutcomeUnknown` is true for purchase `unconfirmed:true`
responses (including HTTP400), transport timeout/network/malformed replies,
redirects and 5xx. Known unconfirmed replies raise `PurchaseOutcomeUnknownException`,
not `ValidationException`. `ResponseData` retains redacted `tx_hash`, `transient`
and future fields. A false flag is not an exactly-once or no-charge guarantee.
Caller cancellation after dispatch may also require reconciliation; cancellation
still uses the standard `OperationCanceledException` contract.

Purchase requests transmit the wallet mnemonic and Fragment session/cookie to
the API operator. Use a secret manager, and do not expose seeds in frontend
code.

## Build, test and release

From `dotnet/`:

```sh
dotnet build src/FragmentDonor.Sdk -c Release
dotnet run --project tests/FragmentDonor.Sdk.Tests -c Release
dotnet format whitespace src/FragmentDonor.Sdk --no-restore --verify-no-changes
dotnet format whitespace tests/FragmentDonor.Sdk.Tests --no-restore --verify-no-changes
dotnet pack src/FragmentDonor.Sdk -c Release -o dist
dotnet run --project tests/PackageCheck -c Release -- --self-test
dotnet run --project tests/PackageCheck -c Release -- dist/FragmentDonor.Sdk.0.1.3.nupkg
dotnet restore tests/PackageSmoke --source dist --configfile NuGet.Config
dotnet run --project tests/PackageSmoke -c Release --no-restore
```

The dependency-free executable test runner consumes `../contract/fixtures.json`
and tests injected deterministic handlers without real purchases. Its nonzero exit
code fails CI. The PackageSmoke executable installs the built local nupkg rather
than referencing SDK source. Inspect nupkg contents before `dotnet nuget push`.
Use repository NuGet trusted publishing where available
or a registry credential supplied through protected CI configuration; never put it in source.
Apply the whitespace gate to PackageSmoke, PackageCheck and QuickStart too.
PackageCheck verifies NuGet identity/version, an exact member allowlist and known
token/private-key patterns in UTF-8 content and UTF-16 assembly strings. It never
prints suspected content and is not proof against every arbitrary secret format.
It permits exactly one known NuGet core-properties member: the older 32-lowercase-
hex name or the deterministic `nuget.psmdcp` name used by
[NuGet.Client](https://github.com/NuGet/NuGet.Client/blob/dev/src/NuGet.Core/NuGet.Packaging/PackageCreation/Authoring/PackageBuilder.cs).
Its `--self-test` rejects unknown namespaces/names, extra or duplicate metadata,
unexpected/duplicate required members and missing metadata; the package still
must have exactly eight members. Repository `global.json` pins the intended
.NET 8 SDK feature band rather than a newer preinstalled runner SDK.
PackageSmoke exercises all four operations, exact decimal strings, HTTP400
unknown-outcome classification and redaction from the installed nupkg with mocks.
