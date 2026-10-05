# Fragment Donor PHP SDK

Independent PHP 8.2+ server-side client, version `0.1.0`. Requires cURL and JSON.
Not affiliated with Telegram, Fragment or TON. Package name remains provisional
until registry availability and publisher access are verified.

```sh
composer require fragment-donor/sdk:^0.1
```

[Source](https://github.com/usnuz/fragment-donor-sdk) ·
[English docs](https://usnuz.github.io/fragment-donor-sdk/en/) ·
[Русский](https://usnuz.github.io/fragment-donor-sdk/ru/) ·
[O‘zbekcha](https://usnuz.github.io/fragment-donor-sdk/uz/)

## Four operations

The direct API needs no account, login, `Authorization` or `X-Api-Key`.
`Api-Key` is an optional TonConsole provider key, not service authentication.
Cookie and mnemonic authorize use of your own Fragment session and wallet.

```php
<?php
require 'vendor/autoload.php';
use FragmentDonor\{Client, Credentials, StarsRequest, PremiumRequest};

$client = new Client(credentials: new Credentials(
    mnemonic: getenv('FRAGMENT_MNEMONIC') ?: '',
    cookie: getenv('FRAGMENT_COOKIE') ?: '',
    providerKey: getenv('TONCONSOLE_API_KEY') ?: null,
    walletVersion: 'auto',
));
$user = $client->getUserInfo('durov');
$balance = $client->walletBalance(); // GET; walletBalance('POST') also supported
echo $balance->ton(); // Decimal string, never convert a balance to float.

// Each call below spends wallet funds. Execute only when you intend to purchase.
$stars = $client->buyStars(new StarsRequest('durov', 50, 'usdt_ton'));
$premium = $client->buyPremium(new PremiumRequest('durov', 3, 'ton'));
```

Stars: `50..1000000`. Premium: `3`, `6`, `12` months. Payment: `usdt_ton`
(default) or `ton`. Wallet versions: `auto`, `v5r1`, `v4r2`, `v3r2`.
Username: optional `@`, then a letter and 3..31 letters/digits/underscores.
Seed format/validity remains a backend check (12/18/24 words, TON or BIP39).
Optional purchase-only `proxy`, `userAgent` and `walletAddress` map to the exact
backend headers; wallet balance omits cookie/proxy/custom Fragment user agent.
Purchase bodies are form-urlencoded. Response `raw` retains future fields.

## Errors, flood wait and retries

```php
use FragmentDonor\{RateLimitError, ServiceUnavailableError, TransportTimeoutError,
    ValidationError, ApiError, MalformedResponseError};
try {
    $client->buyStars(new StarsRequest('durov', 50));
} catch (RateLimitError | ServiceUnavailableError $e) {
    // Let the caller decide whether and when to retry; this SDK never retries purchases.
    $seconds = $e->retryAfter; // maximum of Retry-After seconds/date and JSON hints
} catch (TransportTimeoutError $e) {
    // Purchase completion is unknown. Reconcile before submitting another purchase.
} catch (ValidationError | ApiError | MalformedResponseError $e) {
    // Use the typed status/errorCode and redacted data; never log credentials.
}
```

All endpoints normally share 30 requests/minute per IP. Defaults: connect timeout
10 seconds, total request timeout 60 seconds, zero retries. To opt into read-only
retries use `readOnlyRetries: 2, autoWaitFlood: true, maxWaitSeconds: 60`.
Maximum 2 retries; no wait over 60 seconds. Without `autoWaitFlood`, 429 is raised
immediately. Purchases never retry on any error, including 429/503/timeout/5xx.
Redirects are disabled to avoid forwarding wallet credentials.
Transport errors discard original unsafe messages; API error data is redacted.
Exceptions contain no unsafe chained transport exception. Disable PHP exception
argument traces (`zend.exception_ignore_args=On`) in production, and never enable
cURL verbose logging. An injected transport must also disable redirects, retries
and credential logging.

The backend currently stores submitted mnemonic/cookie/provider/proxy credentials
in its database. SDK redaction cannot change that. Use a dedicated minimally
funded wallet and secret manager; never put real seeds in source or browser code.
Do not claim non-custodial or zero-retention behavior.

## Tests and release

From the monorepo `php/` directory:

```sh
php tests/lint.php
php -d zend.exception_ignore_args=1 tests/run.php
composer validate --strict
composer archive --format=zip --dir=dist
```

Tests consume `../contract/fixtures.json`, inject deterministic transports and
never spend funds. Release via a GitHub source tag registered with Packagist;
Packagist indexes Composer source releases rather than accepting a token upload.
Packagist reads `composer.json` at the repository root. The monorepo provides
a root Composer manifest with the same package and `php/src/` classmap; register
`https://github.com/usnuz/fragment-donor-sdk` there. This standalone subdirectory
manifest can also be used when exporting only the PHP package. Register the
package only after all tests and archive content checks pass.
