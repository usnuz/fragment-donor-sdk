using FragmentDonor.Sdk;

// Read-only by default. Never dump or serialize credentials.
var mnemonic = Environment.GetEnvironmentVariable("FRAGMENT_MNEMONIC") ?? "";
using var client = new FragmentDonorClient(new ClientOptions
{
    Credentials = new WalletCredentials(mnemonic,
        Environment.GetEnvironmentVariable("FRAGMENT_COOKIE"))
    {
        ProviderKey = Environment.GetEnvironmentVariable("TONCONSOLE_API_KEY"),
    },
});
try
{
    var username = Environment.GetEnvironmentVariable("FRAGMENT_USERNAME") ?? "durov";
    var user = await client.GetUserInfoAsync(username);
    Console.WriteLine("Username: " + user.Username);
    if (!string.IsNullOrWhiteSpace(mnemonic))
    {
        var balance = await client.WalletBalanceAsync();
        Console.WriteLine("TON balance: " + balance.Ton);
        if (Environment.GetEnvironmentVariable("FRAGMENT_ALLOW_PURCHASES") == "yes")
        {
            // Exactly one deliberate real-money gift; never repeat blindly.
            var kind = Environment.GetEnvironmentVariable("FRAGMENT_PURCHASE_KIND");
            if (kind == "stars") await client.BuyStarsAsync(new StarsRequest(username, 50));
            else if (kind == "premium") await client.BuyPremiumAsync(new PremiumRequest(username, 3));
            else throw new ArgumentException("Select FRAGMENT_PURCHASE_KIND=stars or premium explicitly.");
        }
    }
}
catch (RateLimitException error) { Console.WriteLine($"Try later in {error.RetryAfter} seconds."); }
catch (ServiceUnavailableException error) { Console.WriteLine($"Try later in {error.RetryAfter} seconds."); }
