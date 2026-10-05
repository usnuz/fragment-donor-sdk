using FragmentDonor.Sdk;

// This example performs read-only calls. Never dump or serialize credentials.
using var client = new FragmentDonorClient(new ClientOptions
{
    Credentials = new WalletCredentials(Environment.GetEnvironmentVariable("FRAGMENT_MNEMONIC") ?? "",
        Environment.GetEnvironmentVariable("FRAGMENT_COOKIE"))
    {
        ProviderKey = Environment.GetEnvironmentVariable("TONCONSOLE_API_KEY"),
    },
});
try
{
    var user = await client.GetUserInfoAsync("durov");
    Console.WriteLine("Username: " + user.Username);
    var balance = await client.WalletBalanceAsync();
    Console.WriteLine("TON balance: " + balance.Ton);
}
catch (RateLimitException error) { Console.WriteLine($"Try later in {error.RetryAfter} seconds."); }
catch (ServiceUnavailableException error) { Console.WriteLine($"Try later in {error.RetryAfter} seconds."); }
