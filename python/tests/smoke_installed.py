"""Run with the installed wheel directory on PYTHONPATH, never the src tree."""

import json
from pathlib import Path

import fragment_donor_sdk
from fragment_donor_sdk import (
    FragmentDonorClient,
    PurchaseOutcomeUnknownError,
    TransportResponse,
    ValidationError,
    WalletCredentials,
)

assert "/src/" not in str(Path(fragment_donor_sdk.__file__).resolve()).replace(
    "\\", "/"
)
requests = []


def transport(request):
    requests.append(request)
    return TransportResponse(
        200,
        {},
        json.dumps({"ok": True, "username": "durov", "is_premium": False}).encode(),
    )


result = FragmentDonorClient(transport=transport).get_user_info("durov")
assert result.username == "durov"
assert len(requests) == 1
assert not {"Authorization", "X-Api-Key", "Mnemonic", "Cookie"}.intersection(
    requests[0].headers
)
assert fragment_donor_sdk.__version__ == "0.1.3"
synthetic = WalletCredentials(
    mnemonic=" ".join(f"SYNTHETIC{i:02}" for i in range(1, 13)),
    cookie="stel_ssid=SYNTHETIC_INSTALLED_SESSION",
)
for method, quantity in (("buy_stars", 50), ("buy_premium", 3)):
    calls = []

    def uncertain_transport(request):
        calls.append(request)
        return TransportResponse(
            400,
            {},
            json.dumps(
                {
                    "ok": False,
                    "unconfirmed": True,
                    "tx_hash": "SYNTHETIC_INSTALLED_TX",
                    "info": "SYNTHETIC_UNCONFIRMED " + synthetic.cookie,
                }
            ).encode(),
        )

    client = FragmentDonorClient(
        transport=uncertain_transport,
        credentials=synthetic,
        readonly_retries=2,
        auto_wait=True,
    )
    try:
        getattr(client, method)("durov", quantity)
    except PurchaseOutcomeUnknownError as error:
        assert not isinstance(error, ValidationError)
        assert error.purchase_outcome_unknown
        assert error.body["tx_hash"] == "SYNTHETIC_INSTALLED_TX"
        assert synthetic.cookie not in str(error)
    else:
        raise AssertionError("Unconfirmed purchase was not surfaced")
    assert len(calls) == 1
print("Installed artifact smoke PASS (mocked HTTP, no purchase)")
