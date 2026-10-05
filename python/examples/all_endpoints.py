"""Server-side example; purchases require an explicit environment opt-in."""

import os

from fragment_donor_sdk import (
    ApiError,
    FloodWaitError,
    FragmentDonorClient,
    WalletCredentials,
)


def main():
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
        if os.getenv("FRAGMENT_ALLOW_PURCHASES") == "yes":
            # Both calls spend real funds; do not retry if their outcome is unknown.
            client.buy_stars(username, 50, credentials=credentials)
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
