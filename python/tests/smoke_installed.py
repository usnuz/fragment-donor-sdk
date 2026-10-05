"""Run with the installed wheel directory on PYTHONPATH, never the src tree."""

import json
from pathlib import Path

import fragment_donor_sdk
from fragment_donor_sdk import FragmentDonorClient, TransportResponse

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
assert fragment_donor_sdk.__version__ == "0.1.0"
print("Installed artifact smoke PASS (mocked HTTP, no purchase)")
