// Trusted server example. Purchases require explicit environment opt-in.
import {
  ApiError,
  FloodWaitError,
  FragmentDonorClient,
  WalletCredentials,
} from "fragment-donor-sdk";

const client = new FragmentDonorClient();
const username = process.env.FRAGMENT_USERNAME ?? "durov";
try {
  console.log("Username:", (await client.getUserInfo(username)).username);
  if (process.env.FRAGMENT_MNEMONIC) {
    const credentials = new WalletCredentials({
      mnemonic: process.env.FRAGMENT_MNEMONIC,
      cookie: process.env.FRAGMENT_COOKIE,
      providerKey: process.env.TONCONSOLE_API_KEY,
    });
    const balance = await client.walletBalance({ credentials });
    console.log("TON:", balance.ton, "USDT:", balance.usdt_ton);
    if (process.env.FRAGMENT_ALLOW_PURCHASES === "yes") {
      // Both operations spend real funds and NEVER retry automatically.
      await client.buyStars(username, 50, { credentials });
      await client.buyPremium(username, 3, { credentials });
    }
  }
} catch (error) {
  if (error instanceof FloodWaitError)
    console.log("FLOOD_WAIT seconds:", error.retryAfter);
  else if (error instanceof ApiError)
    console.log(
      error.name,
      error.status,
      "unknown purchase outcome:",
      error.purchaseOutcomeUnknown,
    );
  else throw error;
}
