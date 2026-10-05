"""Server example; opt in and choose exactly one purchase kind explicitly."""

import os

from fragment_donor_sdk import (
    ApiError,
    FloodWaitError,
    FragmentDonorClient,
    WalletCredentials,
)


def main():
    allow_purchase = os.getenv("FRAGMENT_ALLOW_PURCHASES") == "yes"
    purchase_kind = os.getenv("FRAGMENT_PURCHASE_KIND")
    if allow_purchase and purchase_kind not in {"stars", "premium"}:
        raise SystemExit(
            "Set FRAGMENT_PURCHASE_KIND=stars or premium; no purchase sent"
        )
    client = FragmentDonorClient()
    username = os.getenv("FRAGMENT_USERNAME", "durov")
    try:
        user = client.get_user_info(username)
        print("Username:", user.username)
        if not os.getenv("FRAGMENT_MNEMONIC"):
            return
        credentials = WalletCredentials(
            mnemonic=os.environ["FRAGMENT_MNEMONIC"],
            cookie=os.getenv("FRAGMENT_COOKIE"),
            provider_key=os.getenv("TONCONSOLE_API_KEY"),
        )
        balance = client.wallet_balance(credentials=credentials)
        print("TON:", balance.ton, "USDT:", balance.usdt_ton)
        if allow_purchase and purchase_kind == "stars":
            # One intentional call; do not retry if the outcome is unknown.
            client.buy_stars(username, 50, credentials=credentials)
        elif allow_purchase and purchase_kind == "premium":
            client.buy_premium(username, 3, credentials=credentials)
    except FloodWaitError as error:
        print("FLOOD_WAIT seconds:", error.retry_after)
    except ApiError as error:
        print(
            type(error).__name__,
            "status:",
            error.status,
            "purchase outcome unknown:",
            error.purchase_outcome_unknown,
        )


if __name__ == "__main__":
    main()
