using FragmentDonor.Sdk;
using System.Net;

var handler = new FixtureHandler();
using var client = new FragmentDonorClient(new ClientOptions
{
    Credentials = new WalletCredentials("SYNTHETIC_NOT_A_REAL_MNEMONIC", "stel_ssid=SYNTHETIC_COOKIE_TOKEN"),
    ReadOnlyRetries = 2,
    AutoWaitFlood = true,
}, handler, (_, _) => Task.CompletedTask);
var response = await client.GetUserInfoAsync("durov");
if (response.Username != "durov" || response.Raw["future_field"].GetString() != "kept")
    throw new Exception("Built-package smoke failed.");
var wallet = await client.WalletBalanceAsync();
if (wallet.Ton != "2.500000001" || wallet.UsdtTon != "9007199254740993.01") throw new Exception("Packaged decimals changed.");
foreach (var premium in new[] { false, true })
{
    try
    {
        if (premium) await client.BuyPremiumAsync(new PremiumRequest("durov", 3));
        else await client.BuyStarsAsync(new StarsRequest("durov", 50));
        throw new Exception("Expected unknown purchase result.");
    }
    catch (PurchaseOutcomeUnknownException error)
    {
        if (!error.PurchaseOutcomeUnknown || error.ResponseData["tx_hash"].GetString() != "SYNTHETIC_TX_HASH"
            || error.ResponseData["info"].GetString()!.Contains("SYNTHETIC_COOKIE_TOKEN", StringComparison.Ordinal))
            throw new Exception("Packaged uncertainty/redaction failed.");
    }
}
if (handler.Calls != 4) throw new Exception("Packaged purchase duplicated.");
Console.WriteLine("PASS installed nupkg four-operation/uncertainty/decimal smoke; no network calls.");

using var secretClient = new FragmentDonorClient(new ClientOptions
{
    Credentials = new WalletCredentials("SYNTHETIC_NOT_A_REAL_MNEMONIC", "stel_ssid=SYNTHETIC_COOKIE_TOKEN"),
}, new SecretEchoHandler());
try
{
    await secretClient.WalletBalanceAsync();
    throw new Exception("Expected package error.");
}
catch (ValidationException error)
{
    if (error.ResponseData["error"].GetString()!.Contains("SYNTHETIC_COOKIE_TOKEN", StringComparison.Ordinal))
        throw new Exception("Packaged redaction failed.");
}
Console.WriteLine("PASS packaged partial-credential redaction smoke.");

sealed class FixtureHandler : HttpMessageHandler
{
    public int Calls { get; private set; }
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        Calls++;
        if (request.RequestUri!.AbsolutePath == "/wallet-balance/")
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("{\"ok\":true,\"address\":\"SYNTHETIC_ADDRESS\",\"ton\":\"2.500000001\",\"usdt_ton\":\"9007199254740993.01\"}"),
            });
        if (request.RequestUri.AbsolutePath.StartsWith("/buy-", StringComparison.Ordinal))
        {
            if (request.Method != HttpMethod.Post || !request.Headers.Contains("Cookie") || !request.Headers.Contains("Mnemonic")
                || request.Content?.Headers.ContentType?.MediaType != "application/x-www-form-urlencoded")
                throw new Exception("Packaged purchase mapping failed.");
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.BadRequest)
            {
                Content = new StringContent("{\"ok\":false,\"unconfirmed\":true,\"transient\":true,\"tx_hash\":\"SYNTHETIC_TX_HASH\",\"info\":\"SYNTHETIC_COOKIE_TOKEN\"}"),
            });
        }
        return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("{\"ok\":true,\"username\":\"durov\",\"is_premium\":false,\"future_field\":\"kept\"}"),
        });
    }
}
sealed class SecretEchoHandler : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
        Task.FromResult(new HttpResponseMessage(HttpStatusCode.BadRequest)
        {
            Content = new StringContent("{\"ok\":false,\"error\":\"SYNTHETIC_COOKIE_TOKEN\"}"),
        });
}
