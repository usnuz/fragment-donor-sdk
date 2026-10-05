using FragmentDonor.Sdk;
using System.Net;

using var client = new FragmentDonorClient(handler: new FixtureHandler());
var response = await client.GetUserInfoAsync("durov");
if (response.Username != "durov" || response.Raw["future_field"].GetString() != "kept")
    throw new Exception("Built-package smoke failed.");
Console.WriteLine("PASS installed nupkg client smoke; no network calls.");

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
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
        Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("{\"ok\":true,\"username\":\"durov\",\"is_premium\":false,\"future_field\":\"kept\"}"),
        });
}
sealed class SecretEchoHandler : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken) =>
        Task.FromResult(new HttpResponseMessage(HttpStatusCode.BadRequest)
        {
            Content = new StringContent("{\"ok\":false,\"error\":\"SYNTHETIC_COOKIE_TOKEN\"}"),
        });
}
