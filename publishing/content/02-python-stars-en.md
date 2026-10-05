# Buy Telegram Stars API Python integration without duplicate retries

Audience: Python backend engineers. Tags: `python`, `api`, `testing`, `security`.
Format: substantive tutorial. Status: READY draft. No registry release claimed.

## Article

Disclosure: AI-assisted draft for the independent Fragment Donor SDK project;
not an official Telegram, Fragment, or TON integration. The example does not
make or prove a real purchase.

A small Python SDK can remove request-format guesswork, but the important design
choice is what it refuses to do: repeat a payment after an ambiguous timeout.
Fragment Donor's Python 3.10+ client uses standard-library HTTP, typed response
models and decimal strings. It sends form-urlencoded purchase bodies and never
auto-retries `buy_stars` or `buy_premium`.

Version 0.1.0 is prepared; consult the publication status before using the registry
command `python -m pip install fragment-donor-sdk==0.1.0`. Before registry release,
install the clean source locally:

```sh
git clone https://github.com/usnuz/fragment-donor-sdk.git
python -m pip install ./fragment-donor-sdk/python
```

Username lookup needs no service account/key or wallet:

```python
from fragment_donor_sdk import FragmentDonorClient

client = FragmentDonorClient(timeout=30)
user = client.get_user_info("durov")
print(user.username, user.is_premium)
```

The following code is purchase-gated and server-only. Obtain real credentials
through a trusted server secret manager, never an article, repository or browser.
The gate prevents accidental execution; it does not make purchasing risk-free.

```python
import os
from fragment_donor_sdk import (
    ApiError, FragmentDonorClient, TransportError, WalletCredentials,
)

if os.getenv("FRAGMENT_ALLOW_PURCHASES") != "yes":
    raise SystemExit("Purchase disabled; use mocked transport for the tutorial")

credentials = WalletCredentials(
    mnemonic=os.environ["FRAGMENT_MNEMONIC"],
    cookie=os.environ["FRAGMENT_COOKIE"],
    wallet_version="auto",
    provider_key=os.getenv("TONCONSOLE_API_KEY"),
)
client = FragmentDonorClient(credentials=credentials, timeout=30)
try:
    result = client.buy_stars("durov", 50, payment_method="usdt_ton")
    print("API responded to the intended purchase")
except TransportError as error:
    print("Reconcile before another purchase:", error.purchase_outcome_unknown)
except ApiError as error:
    print(type(error).__name__, error.status, error.retry_after)
```

Do not print `credentials`, request headers or raw transport internals. SDK-owned
diagnostics redact known secrets and refuse redirects, but custom transports can
still leak headers or introduce hidden retries. Use the test transport instead
of enabling the purchase gate in CI or a screen recording.

The amount is an integer between 50 and 1,000,000. `usdt_ton` is default; `ton` is
the other accepted payment method. Optional `Api-Key` is a TonConsole provider
key, not service authentication. The usual 30/minute shared IP window and 429
wait apply across all four endpoints. A 429/503 is surfaced for the caller;
purchase methods still do not retry automatically.

Finally, SDK redaction does not imply non-custodial operation: the inspected
backend persists submitted credentials. Trust that operator boundary explicitly,
and keep a dedicated minimally funded wallet rather than a primary savings seed.

[Python source/tests/examples](https://github.com/usnuz/fragment-donor-sdk/tree/main/python) ·
[Python documentation](https://usnuz.github.io/fragment-donor-sdk/en/sdk/python/) ·
[Flood-wait guide](https://usnuz.github.io/fragment-donor-sdk/en/guides/rate-limit-flood-wait/).
