using FragmentDonor.Sdk;
using System.Net;
using System.Text;
using System.Text.Json;

using var fixturesDoc = JsonDocument.Parse(File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "fixtures.json")));
var fixtures = fixturesDoc.RootElement;
var responses = fixtures.GetProperty("responses");
var credentials = fixtures.GetProperty("credentials");
var tests = 0;
WalletCredentials Credentials() => new(credentials.GetProperty("mnemonic").GetString()!, credentials.GetProperty("cookie").GetString())
{
    ProviderKey = credentials.GetProperty("provider_key").GetString(),
    Proxy = "https://SYNTHETIC_USER:SYNTHETIC_PASSWORD@proxy.invalid",
    WalletAddress = "SYNTHETIC_ADDRESS",
    UserAgent = "SYNTHETIC_FRAGMENT_AGENT",
    WalletVersion = "v5r1",
};
HttpResponseMessage Response(string key, int status = 200, string? retry = null)
{
    var response = new HttpResponseMessage((HttpStatusCode)status) { Content = new StringContent(responses.GetProperty(key).GetRawText(), Encoding.UTF8, "application/json") };
    if (retry is not null) response.Headers.TryAddWithoutValidation("Retry-After", retry);
    return response;
}
async Task Test(string name, Func<Task> run) { await run(); tests++; Console.WriteLine("PASS " + name); }
static void Check(bool condition, string message) { if (!condition) throw new Exception(message); }
static async Task<T> Error<T>(Func<Task> call) where T : Exception
{
    try { await call(); } catch (T error) { return error; }
    throw new Exception("Expected " + typeof(T).Name);
}

await Test("GET user query, no auth or credentials, unknown fields retained", async () =>
{
    var fake = new FakeHandler(Response("user_info"));
    using var client = new FragmentDonorClient(new ClientOptions { Credentials = Credentials() }, fake);
    var result = await client.GetUserInfoAsync("@durov");
    var req = fake.Requests.Single();
    Check(req.Method == "GET" && req.Url == "https://fragment.donor.uz/get-user-info/?username=%40durov", "Wrong user query");
    Check(!req.Headers.ContainsKey("Mnemonic") && !req.Headers.ContainsKey("Cookie") && !req.Headers.ContainsKey("Authorization") && !req.Headers.ContainsKey("X-Api-Key"), "Unnecessary credentials");
    Check(result.Username == "durov" && result.IsPremium == false && result.Raw["future_field"].GetProperty("kept").GetBoolean(), "Lost response fields");
});
await Test("Stars form, purchase and optional headers", async () =>
{
    var fake = new FakeHandler(Response("purchase"));
    using var client = new FragmentDonorClient(new ClientOptions { Credentials = Credentials() }, fake);
    var result = await client.BuyStarsAsync(new StarsRequest("@durov", 50, "ton"));
    var req = fake.Requests.Single();
    Check(req.Method == "POST" && req.Url.EndsWith("/buy-stars/", StringComparison.Ordinal), "Wrong Stars request");
    Check(req.Body == "username=%40durov&amount=50&payment_method=ton", "Wrong form body");
    Check(req.ContentType == "application/x-www-form-urlencoded", "Wrong content type");
    Check(req.Headers["Mnemonic"] == credentials.GetProperty("mnemonic").GetString() && req.Headers["Cookie"] == credentials.GetProperty("cookie").GetString(), "Missing credentials");
    Check(req.Headers["Api-Key"] == credentials.GetProperty("provider_key").GetString() && req.Headers["Wallet-Version"] == "v5r1" && req.Headers["Wallet-Address"] == "SYNTHETIC_ADDRESS"
        && req.Headers.ContainsKey("Proxy") && req.Headers["User-Agent"] == "SYNTHETIC_FRAGMENT_AGENT", "Optional mapping mismatch");
    Check(result.Raw["future_field"].GetString() == "preserve", "Purchase lost future fields");
});
await Test("Premium exact method/path/form", async () =>
{
    var fake = new FakeHandler(Response("purchase"));
    using var client = new FragmentDonorClient(new ClientOptions { Credentials = Credentials() }, fake);
    await client.BuyPremiumAsync(new PremiumRequest("durov", 12));
    var req = fake.Requests.Single();
    Check(req.Method == "POST" && req.Url.EndsWith("/buy-premium/", StringComparison.Ordinal) && req.Body == "username=durov&duration=12&payment_method=usdt_ton", "Wrong Premium request");
});
await Test("Wallet GET/POST, exact decimals, no cookie/proxy", async () =>
{
    foreach (var post in new[] { false, true })
    {
        var fake = new FakeHandler(Response("wallet_balance"));
        using var client = new FragmentDonorClient(new ClientOptions { Credentials = Credentials() }, fake);
        var result = await client.WalletBalanceAsync(usePost: post);
        var req = fake.Requests.Single();
        Check(req.Method == (post ? "POST" : "GET") && req.Url.EndsWith("/wallet-balance/", StringComparison.Ordinal), "Wrong wallet request");
        Check(!req.Headers.ContainsKey("Cookie") && !req.Headers.ContainsKey("Proxy") && req.Headers.ContainsKey("Mnemonic") && req.Headers.ContainsKey("Api-Key"), "Wallet credential scope wrong");
        Check(result.Ton == "2.500000001" && result.UsdtTon == "9007199254740993.01" && result.Raw["future_field"].GetString() == "preserve", "Decimal precision lost");
    }
});
await Test("Validation before network", async () =>
{
    var fake = new FakeHandler();
    using var client = new FragmentDonorClient(handler: fake);
    foreach (var call in new Func<Task>[] { () => Task.FromResult(new StarsRequest("durov", 49)), () => Task.FromResult(new StarsRequest("durov", 1000001)),
        () => Task.FromResult(new PremiumRequest("durov", 1)), () => Task.FromResult(new StarsRequest("durov", 50, "card")),
        () => client.GetUserInfoAsync("bad!"), () => client.WalletBalanceAsync(),
        () => Task.FromResult(new FragmentDonorClient(new ClientOptions { BaseUrl = new Uri("https://SYNTHETIC_USER:SYNTHETIC_PASSWORD@host.invalid") })) })
        await Error<ValidationException>(call);
    Check(fake.Requests.Count == 0, "Validation reached transport");
    using var badHeader = new FragmentDonorClient(new ClientOptions { Credentials = new WalletCredentials("bad\r\nheader") }, fake);
    await Error<ValidationException>(() => badHeader.WalletBalanceAsync());
});
await Test("400, false ok, invalid JSON and wrong shape typed", async () =>
{
    using var invalid = new FragmentDonorClient(handler: new FakeHandler(Response("validation", 400)));
    await Error<ValidationException>(() => invalid.GetUserInfoAsync("durov"));
    using var upstream = new FragmentDonorClient(handler: new FakeHandler(Response("upstream_error")));
    await Error<ApiException>(() => upstream.GetUserInfoAsync("durov"));
    foreach (var body in new[] { "invalid", "[true]" })
    {
        using var client = new FragmentDonorClient(handler: new FakeHandler(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(body) }));
        await Error<MalformedResponseException>(() => client.GetUserInfoAsync("durov"));
    }
});
await Test("429 seconds/date and JSON hints; 503 HTML hint", async () =>
{
    using var flood = new FragmentDonorClient(handler: new FakeHandler(Response("flood_wait", 429, "50")));
    var error = await Error<RateLimitException>(() => flood.GetUserInfoAsync("durov"));
    Check(error.RetryAfter == 50 && error.ErrorCode == "FLOOD_WAIT", "Wrong flood hint");
    using var date = new FragmentDonorClient(handler: new FakeHandler(Response("flood_wait", 429, "Tue, 01 Jan 2030 00:01:00 GMT")), clock: () => DateTimeOffset.FromUnixTimeSeconds(1893456000));
    Check((await Error<RateLimitException>(() => date.GetUserInfoAsync("durov"))).RetryAfter == 60, "Wrong HTTP-date");
    var html = new HttpResponseMessage(HttpStatusCode.ServiceUnavailable) { Content = new StringContent("<html>maintenance</html>") };
    html.Headers.TryAddWithoutValidation("Retry-After", "5");
    using var unavailable = new FragmentDonorClient(handler: new FakeHandler(html));
    Check((await Error<ServiceUnavailableException>(() => unavailable.GetUserInfoAsync("durov"))).RetryAfter == 5, "Wrong 503 hint");
});
await Test("Both purchases never retry any error", async () =>
{
    for (var kind = 0; kind < 6; kind++)
    {
        foreach (var premium in new[] { false, true })
        {
            object first = kind switch
            {
                0 => Response("flood_wait", 429),
                1 => Response("unavailable", 503),
                2 => Response("validation", 500),
                3 => new TaskCanceledException("private"),
                4 => new HttpRequestException("private"),
                _ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("invalid") }
            };
            var fake = new FakeHandler(first, Response("purchase"));
            using var client = new FragmentDonorClient(new ClientOptions { Credentials = Credentials(), ReadOnlyRetries = 2, AutoWaitFlood = true }, fake, (_, _) => Task.CompletedTask);
            await Error<SdkException>(() => premium ? client.BuyPremiumAsync(new PremiumRequest("durov", 3)) : client.BuyStarsAsync(new StarsRequest("durov", 50)));
            Check(fake.Requests.Count == 1, "Duplicate purchase!");
        }
    }
});
await Test("Read-only retries opt-in, bounded and wait capped", async () =>
{
    var waits = new List<double>();
    var fake = new FakeHandler(Response("flood_wait", 429), Response("user_info"));
    using var client = new FragmentDonorClient(new ClientOptions { ReadOnlyRetries = 2, AutoWaitFlood = true }, fake,
        (wait, _) => { waits.Add(wait.TotalSeconds); return Task.CompletedTask; });
    await client.GetUserInfoAsync("durov");
    Check(fake.Requests.Count == 2 && waits.SequenceEqual(new[] { 42d }), "Opt-in retry broken");
    var noWait = new FakeHandler(Response("flood_wait", 429), Response("user_info"));
    using var noAuto = new FragmentDonorClient(new ClientOptions { ReadOnlyRetries = 2 }, noWait);
    await Error<RateLimitException>(() => noAuto.GetUserInfoAsync("durov"));
    Check(noWait.Requests.Count == 1, "Flood wait not opted in");
    var longWait = new FakeHandler(Response("unavailable", 503, "61"), Response("user_info"));
    using var capped = new FragmentDonorClient(new ClientOptions { ReadOnlyRetries = 2 }, longWait);
    await Error<ServiceUnavailableException>(() => capped.GetUserInfoAsync("durov"));
    Check(longWait.Requests.Count == 1, "Wait exceeded cap");
    var bounded = new FakeHandler(Response("unavailable", 503), Response("unavailable", 503), Response("unavailable", 503), Response("user_info"));
    using var maximum = new FragmentDonorClient(new ClientOptions { ReadOnlyRetries = 2 }, bounded, (_, _) => Task.CompletedTask);
    await Error<ServiceUnavailableException>(() => maximum.GetUserInfoAsync("durov"));
    Check(bounded.Requests.Count == 3, "Retries unbounded");
});
await Test("Unconfirmed HTTP400 is uncertain, preserves redacted reconciliation data, never repeats either purchase", async () =>
{
    foreach (var premium in new[] { false, true })
    {
        var secret = credentials.GetProperty("mnemonic").GetString()!;
        var body = JsonSerializer.Serialize(new
        {
            ok = false,
            unconfirmed = true,
            transient = true,
            tx_hash = "SYNTHETIC_TX_HASH",
            info = secret,
            future_field = new { amount = "9007199254740993.01", cookie = "SYNTHETIC_ECHO" }
        });
        var fake = new FakeHandler(new HttpResponseMessage(HttpStatusCode.BadRequest) { Content = new StringContent(body) }, Response("purchase"));
        var waits = 0;
        using var client = new FragmentDonorClient(new ClientOptions { Credentials = Credentials(), ReadOnlyRetries = 2, AutoWaitFlood = true }, fake,
            (_, _) => { waits++; return Task.CompletedTask; });
        var error = await Error<PurchaseOutcomeUnknownException>(() => premium
            ? client.BuyPremiumAsync(new PremiumRequest("durov", 3)) : client.BuyStarsAsync(new StarsRequest("durov", 50)));
        Check(error.PurchaseOutcomeUnknown && error.StatusCode == 400, "Missing uncertain outcome");
        Check(error.ResponseData["tx_hash"].GetString() == "SYNTHETIC_TX_HASH" && error.ResponseData["unconfirmed"].GetBoolean()
            && error.ResponseData["transient"].GetBoolean() && error.ResponseData["future_field"].GetProperty("amount").GetString() == "9007199254740993.01", "Reconciliation data lost");
        Check(!error.ToString().Contains(secret, StringComparison.Ordinal) && !JsonSerializer.Serialize(error.ResponseData).Contains(secret, StringComparison.Ordinal)
            && error.ResponseData["future_field"].GetProperty("cookie").GetString() == "[REDACTED]", "Uncertainty error leaked secrets");
        Check(fake.Requests.Count == 1 && waits == 0 && error.InnerException is null, "Unconfirmed purchase repeated or unsafe cause retained");
    }
});
await Test("Purchase transport/malformed errors carry unknown flag; reads and local validation do not", async () =>
{
    foreach (var premium in new[] { false, true })
    {
        foreach (var kind in new[] { "timeout", "network", "malformed", "503" })
        {
            object first = kind switch
            {
                "timeout" => new TaskCanceledException("SYNTHETIC_UNSAFE_TRANSPORT"),
                "network" => new HttpRequestException("SYNTHETIC_UNSAFE_TRANSPORT"),
                "503" => Response("unavailable", 503),
                _ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("invalid JSON") },
            };
            var fake = new FakeHandler(first, Response("purchase"));
            using var client = new FragmentDonorClient(new ClientOptions { Credentials = Credentials(), ReadOnlyRetries = 2 }, fake);
            var error = await Error<SdkException>(() => premium
                ? client.BuyPremiumAsync(new PremiumRequest("durov", 3)) : client.BuyStarsAsync(new StarsRequest("durov", 50)));
            Check(error.PurchaseOutcomeUnknown && fake.Requests.Count == 1, "Missing purchase uncertainty");
            Check(!error.ToString().Contains("SYNTHETIC_UNSAFE_TRANSPORT", StringComparison.Ordinal) && error.InnerException is null, "Unsafe cause retained");
        }
    }
    using var read = new FragmentDonorClient(handler: new FakeHandler(new TaskCanceledException("private")));
    Check(!(await Error<TransportTimeoutException>(() => read.GetUserInfoAsync("durov"))).PurchaseOutcomeUnknown, "Read marked as purchase");
    Check(!(await Error<ValidationException>(() => Task.FromResult(new StarsRequest("durov", 49)))).PurchaseOutcomeUnknown, "Local validation uncertain");
});
await Test("Redacted credential diagnostics, unsafe errors discarded, cancellation honored", async () =>
{
    var secret = credentials.GetProperty("mnemonic").GetString()!;
    var opts = new ClientOptions { Credentials = Credentials() };
    using var client = new FragmentDonorClient(opts, new FakeHandler(new HttpRequestException(secret)));
    var error = await Error<TransportException>(() => client.WalletBalanceAsync());
    Check(!error.ToString().Contains(secret, StringComparison.Ordinal) && error.InnerException is null, "Transport error leaked");
    Check(!client.ToString().Contains(secret, StringComparison.Ordinal) && !opts.ToString().Contains(secret, StringComparison.Ordinal)
        && !JsonSerializer.Serialize(opts.Credentials).Contains(secret, StringComparison.Ordinal), "Credential diagnostics leaked");
    var body = JsonSerializer.Serialize(new { ok = false, error = secret, nested = new { cookie = "UNKNOWN_SECRET" } });
    using var api = new FragmentDonorClient(opts, new FakeHandler(new HttpResponseMessage(HttpStatusCode.BadRequest) { Content = new StringContent(body) }));
    var rejected = await Error<ValidationException>(() => api.WalletBalanceAsync());
    Check(!JsonSerializer.Serialize(rejected.ResponseData).Contains(secret, StringComparison.Ordinal)
        && rejected.ResponseData["nested"].GetProperty("cookie").GetString() == "[REDACTED]", "API error leaked");
    using var cts = new CancellationTokenSource(); cts.Cancel();
    await Error<OperationCanceledException>(() => client.GetUserInfoAsync("durov", cts.Token));
});
await Test("Partial cookie token, proxy password, normalized and encoded seed echoes redacted", async () =>
{
    var secret = credentials.GetProperty("mnemonic").GetString()!;
    var creds = new WalletCredentials(secret.Replace(" ", "  ", StringComparison.Ordinal), "stel_ssid=SYNTHETIC_COOKIE_TOKEN")
    {
        Proxy = "https://SYNTHETIC_PROXY_USER:SYNTHETIC_PROXY_PASSWORD@proxy.invalid",
    };
    var echo = secret + " " + Uri.EscapeDataString(secret) + " SYNTHETIC_COOKIE_TOKEN SYNTHETIC_PROXY_PASSWORD";
    var body = JsonSerializer.Serialize(new { ok = false, error = echo });
    using var client = new FragmentDonorClient(new ClientOptions { Credentials = creds },
        new FakeHandler(new HttpResponseMessage(HttpStatusCode.BadRequest) { Content = new StringContent(body) }));
    var error = await Error<ValidationException>(() => client.WalletBalanceAsync());
    var serialized = JsonSerializer.Serialize(error.ResponseData);
    foreach (var value in new[] { secret, Uri.EscapeDataString(secret), "SYNTHETIC_COOKIE_TOKEN", "SYNTHETIC_PROXY_PASSWORD" })
        Check(!serialized.Contains(value, StringComparison.Ordinal), "Partial credential echo leaked");
});
Console.WriteLine($"{tests} tests passed; no real HTTP requests or purchases made.");

sealed record RecordedRequest(string Method, string Url, Dictionary<string, string> Headers, string? Body, string? ContentType);
sealed class FakeHandler(params object[] queue) : HttpMessageHandler
{
    private readonly Queue<object> pending = new(queue);
    public List<RecordedRequest> Requests { get; } = [];
    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var body = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);
        Requests.Add(new RecordedRequest(request.Method.Method, request.RequestUri!.AbsoluteUri,
            request.Headers.ToDictionary(h => h.Key, h => string.Join(",", h.Value)), body, request.Content?.Headers.ContentType?.MediaType));
        if (pending.Count == 0) throw new Exception("No mock response");
        var next = pending.Dequeue();
        if (next is Exception error) throw error;
        return (HttpResponseMessage)next;
    }
}
