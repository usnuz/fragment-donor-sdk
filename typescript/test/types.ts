import {
  FragmentDonorClient,
  WalletCredentials,
  type UserInfoResponse,
  type WalletBalanceResponse,
  type PurchaseResponse,
  ApiError,
} from "../src/index.js";

const client = new FragmentDonorClient();
const user: Promise<UserInfoResponse> = client.getUserInfo("durov");
const wallet: Promise<WalletBalanceResponse> = client.walletBalance();
const purchase: Promise<PurchaseResponse> = client.buyStars("durov", 50);
const creds = new WalletCredentials({
  mnemonic:
    "SYNTHETIC01 SYNTHETIC02 SYNTHETIC03 SYNTHETIC04 SYNTHETIC05 SYNTHETIC06 SYNTHETIC07 SYNTHETIC08 SYNTHETIC09 SYNTHETIC10 SYNTHETIC11 SYNTHETIC12",
});
client.buyPremium("durov", 3, { credentials: creds });
// @ts-expect-error duration is restricted by the backend contract
client.buyPremium("durov", 4);
// @ts-expect-error unknown payment method must not typecheck
client.buyStars("durov", 50, { paymentMethod: "btc" });
// @ts-expect-error there is no service API key configuration
new FragmentDonorClient({ serviceApiKey: "unsupported" });
async function decimalStrings() {
  const balance = await wallet;
  const exact: string = balance.usdt_ton;
  // @ts-expect-error balances must not become floating point numbers
  const bad: number = balance.ton;
  const extension: unknown = (await user).future_field;
  return { exact, bad, extension, purchase };
}
const failure: ApiError = new ApiError("safe", { retryAfter: 42 });
void decimalStrings;
void failure;
