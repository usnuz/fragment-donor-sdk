# Username lookup and wallet balance: two reads, different trust boundaries

Audience: backend engineers. Tags: `python`, `decimal`, `api`, `security`.
Status: READY AI-assisted draft for the independent Fragment Donor project.
Not an official Telegram, Fragment or TON product; no real purchase demonstrated.

## Article

`get_user_info` and `wallet_balance` are both read-only, but only username lookup
is credential-free. Lookup sends one query parameter and no wallet headers.
Balance sends a mnemonic; the SDK omits Fragment Cookie because this endpoint
does not need a Fragment session. “Read-only” does not mean “safe to expose to an
untrusted browser or intermediary.”

```python
import os
from decimal import Decimal
from fragment_donor_sdk import FragmentDonorClient, WalletCredentials

public = FragmentDonorClient(timeout=30)
user = public.get_user_info("durov")
print(user.username, user.is_premium)

# Run balance only on a trusted server; the secret never belongs in the tutorial.
credentials = WalletCredentials(mnemonic=os.environ["FRAGMENT_MNEMONIC"])
wallet = FragmentDonorClient(credentials=credentials, timeout=30).wallet_balance()
ton = Decimal(wallet.ton)
usdt = Decimal(wallet.usdt_ton)
print(ton, usdt)  # balances may themselves be private in a real application
```

The backend accepts GET and POST for `/wallet-balance/`; Python/Node/Go/Rust/Ruby
clients use GET, while PHP/.NET document their optional POST support. All versions
preserve `ton` and `usdt_ton` as exact decimal strings. Converting a large USDT
balance to a binary float can discard digits, so do not use Python `float`,
JavaScript `Number`, C# `double` or Go `float64` for amounts. A language decimal
library is a caller choice; retaining the original string is safe for display.

Unknown response fields are preserved for forward compatibility, not discarded
when the server adds data. Avoid dumping the entire raw response into telemetry:
future fields can be sensitive, and log redaction is not proof that every possible
server string is harmless.

No service account or `Authorization`/`X-Api-Key` is required. Provider `Api-Key`
is optional TonConsole configuration. A valid username response is not a price
quote or payment guarantee; a balance is not an authorization to spend it.

The shared default quota is 30 requests/IP/minute across all four operations.
Do not poll balance in a loop for every frontend keystroke. If automatic read-only
retry is desired, enable it explicitly with at most two retries and 60 seconds
per wait; 429 supports `Retry-After` seconds/date and JSON hints. Purchases remain
non-retrying even on a client configured for read retries.

Purchase requests transmit wallet mnemonic and Fragment session/cookie data to
the API operator. Keep mnemonic access in a
server secret manager and evaluate operator trust before invoking any wallet API.

[Balance docs](https://usnuz.github.io/fragment-donor-sdk/en/reference/wallet-balance/) ·
[Username docs](https://usnuz.github.io/fragment-donor-sdk/en/reference/get-user-info/) ·
[Source](https://github.com/usnuz/fragment-donor-sdk).
