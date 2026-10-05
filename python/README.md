# Fragment Donor SDK for Python

`fragment-donor-sdk` 0.1.0 is a dependency-free, typed, synchronous client for
the independent [Fragment Donor API](https://fragment.donor.uz).
It is not an official Telegram, Fragment, or TON product. Python 3.10+.

Registry release may still be pending; see the repository publication status.
After release:

```sh
python -m pip install fragment-donor-sdk==0.1.0
```

There is no service login, account, API key, `Authorization`, or `X-Api-Key`.
Wallet operations need your own credentials. `provider_key` maps only to the
optional TonConsole `Api-Key`, not service authentication.

## Quick start and four methods

Username lookup needs no wallet or provider key:

```python
from fragment_donor_sdk import FragmentDonorClient

client = FragmentDonorClient(timeout=30)
user = client.get_user_info("durov")
print(user.username, user.is_premium)
```

Wallet/purchase code belongs on a trusted server. Set secrets through your
deployment secret manager, never in a committed `.env` or browser configuration:

```python
import os
from fragment_donor_sdk import FragmentDonorClient, WalletCredentials

credentials = WalletCredentials(
    mnemonic=os.environ["FRAGMENT_MNEMONIC"],  # 12/18/24 words; never print
    cookie=os.environ["FRAGMENT_COOKIE"],
    wallet_version="auto",                     # auto | v5r1 | v4r2 | v3r2
    wallet_address=os.getenv("FRAGMENT_WALLET_ADDRESS"),
    provider_key=os.getenv("TONCONSOLE_API_KEY"),
)
client = FragmentDonorClient(credentials=credentials, timeout=30)
balance = client.wallet_balance()              # GET; cookie is not sent
print(balance.ton, balance.usdt_ton)            # exact decimal strings

# These two methods spend funds. Call only after deliberate purchase approval.
# stars = client.buy_stars("durov", 50, payment_method="usdt_ton")
# premium = client.buy_premium("durov", 3, payment_method="ton")
```

`buy_stars`: integer 50–1,000,000; `buy_premium`: 3, 6, or 12 months.
Payment methods: `usdt_ton` (default) and `ton`.
Optional purchase credential options: `proxy`, `user_agent`, wallet version,
wallet address, and provider key. Credentials can also be overridden per call:
`client.buy_stars("durov", 50, credentials=credentials)`.
The backend also supports POST `/wallet-balance/`; this SDK uses GET.
All purchase bodies are form-urlencoded. All responses are mappings preserving
unknown fields (`result["future_field"]`), with typed properties for known fields.
No financial field is parsed as float; use `decimal.Decimal(balance.usdt_ton)`
if you need arithmetic.

## Errors, flood wait, and retries

```python
from fragment_donor_sdk import ApiError, FloodWaitError, TransportError

try:
    user = client.get_user_info("durov")
except FloodWaitError as error:
    print("Try again after", error.retry_after, "seconds")
except TransportError as error:
    print("Transport failure; uncertain purchase:", error.purchase_outcome_unknown)
except ApiError as error:
    print(type(error).__name__, error.status)   # avoid dumping requests
```

Other error subclasses: `ValidationError`, `ServiceUnavailableError`,
`MalformedResponseError`. Errors expose sanitized `body`, `status`,
`error_code`, `retry_after`, and `purchase_outcome_unknown`.
HTTP 429, HTTP 503, header seconds/HTTP-date, and JSON `retry_after`/`flood_wait`
are recognized. Conflicting valid waits use the longest hint.

All four endpoints share the same per-IP window, normally 30 requests/minute.
Retries and automatic waiting are disabled by default. Enable bounded retries
for the two read-only operations only:

```python
client = FragmentDonorClient(readonly_retries=2, auto_wait=True, max_wait_seconds=60)
```

At most two read-only retries occur. A server wait greater than the configured
maximum returns the error instead of retrying too early. Retry counts and waits
remain bounded. PURCHASES NEVER RETRY automatically, including 429/503. After
a timeout, reset, malformed reply, or 5xx, inspect actual wallet/delivery history
before deciding on a new purchase. The backend has no idempotency-key guarantee.

## Credential handling

The SDK has no telemetry and hides credential values in normal client,
credentials, request, and error representations. Known credential echoes and
sensitive JSON keys are redacted. Custom transports receive actual headers and
must never log them. Python introspection and explicit access to credential
fields cannot be made secret; keep these objects inside the trusted server.
HTTP redirects are disabled so headers cannot be forwarded to another site.
HTTPS is required except localhost for deterministic integration tests.

The inspected backend stores submitted credentials in its database. SDK
redaction does not imply zero server retention or non-custodial operation.
Use a dedicated minimally funded wallet and trust the operator accordingly.

## Development and release

From this folder:

```sh
PYTHONPATH=src python -W error -m unittest discover -s tests -v
python -m pip install build
python -m build
python -m pip install --no-deps dist/fragment_donor_sdk-0.1.0-py3-none-any.whl
```

Tests use the shared `../contract/fixtures.json` and mocked transports; the only
network test is an ephemeral loopback redirect server. No real purchase occurs.
The executable example defaults to reads only. Spending requires BOTH
`FRAGMENT_ALLOW_PURCHASES=yes` and `FRAGMENT_PURCHASE_KIND=stars` or `premium`;
it executes only that one selected gift. Missing/invalid selection fails safely
before dispatch; do not enable spending in CI or a demonstration.
Build contents must contain only SDK source, typing marker, README/license and
package metadata. Publish verified wheel/sdist with PyPI Trusted Publishing;
the repository workflow performs release gates before publication.

[Documentation](https://usnuz.github.io/fragment-donor-sdk/en/)
· [Source](https://github.com/usnuz/fragment-donor-sdk/tree/main/python)
· [Issues](https://github.com/usnuz/fragment-donor-sdk/issues)
