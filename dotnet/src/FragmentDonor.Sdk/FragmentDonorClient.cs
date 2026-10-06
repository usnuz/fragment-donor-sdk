using System.Globalization;
using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace FragmentDonor.Sdk;

public sealed class FragmentDonorClient : IDisposable
{
    private readonly ClientOptions options;
    private readonly HttpClient http;
    private readonly Func<TimeSpan, CancellationToken, Task> delay;
    private readonly Func<DateTimeOffset> clock;
    private readonly string[] secrets;

    // Injected handlers must not add redirects, hidden retries, or credential logging.
    public FragmentDonorClient(ClientOptions? options = null, HttpMessageHandler? handler = null,
        Func<TimeSpan, CancellationToken, Task>? delay = null, Func<DateTimeOffset>? clock = null)
    {
        this.options = options ?? new ClientOptions();
        var url = this.options.BaseUrl;
        if (!url.IsAbsoluteUri || !string.IsNullOrEmpty(url.UserInfo) || !string.IsNullOrEmpty(url.Query)
            || !string.IsNullOrEmpty(url.Fragment) || (url.Scheme != "https" && !(url.Scheme == "http" && url.IsLoopback)))
            throw new ValidationException("Base URL must use HTTPS (or HTTP on loopback), without user info, query or fragment.");
        if (this.options.ConnectTimeout <= TimeSpan.Zero || this.options.RequestTimeout <= TimeSpan.Zero)
            throw new ValidationException("Timeouts must be positive.");
        if (this.options.ReadOnlyRetries is < 0 or > 2 || this.options.MaxWaitSeconds is < 0 or > 60)
            throw new ValidationException("Read-only retries must be 0..2; maximum wait must be 0..60 seconds.");
        http = new HttpClient(handler ?? new SocketsHttpHandler
        {
            AllowAutoRedirect = false,
            ConnectTimeout = this.options.ConnectTimeout,
            UseCookies = false,
        }, disposeHandler: true)
        { Timeout = this.options.RequestTimeout };
        this.delay = delay ?? Task.Delay;
        this.clock = clock ?? (() => DateTimeOffset.UtcNow);
        secrets = this.options.Credentials?.Secrets().OrderByDescending(s => s.Length).ToArray() ?? [];
    }
    public override string ToString() => "FragmentDonorClient (credentials redacted)";
    public void Dispose() => http.Dispose();

    public async Task<UserInfoResponse> GetUserInfoAsync(string username, CancellationToken cancellationToken = default)
    {
        Validation.Username(username);
        var raw = await CallAsync(HttpMethod.Get, "/get-user-info/",
            new() { ["username"] = username }, cancellationToken: cancellationToken).ConfigureAwait(false);
        if (!raw.TryGetValue("username", out var user) || user.ValueKind != JsonValueKind.String
            || !raw.TryGetValue("is_premium", out var premium) || premium.ValueKind is not (JsonValueKind.True or JsonValueKind.False))
            throw new MalformedResponseException("User response has invalid fields.");
        return new UserInfoResponse(raw);
    }
    public async Task<PurchaseResponse> BuyStarsAsync(StarsRequest request, CancellationToken cancellationToken = default)
    {
        return new PurchaseResponse(await CallAsync(HttpMethod.Post, "/buy-stars/", new()
        {
            ["username"] = request.Username,
            ["amount"] = request.Amount.ToString(CultureInfo.InvariantCulture),
            ["payment_method"] = request.PaymentMethod,
        }, purchase: true, cancellationToken: cancellationToken).ConfigureAwait(false));
    }
    public async Task<PurchaseResponse> BuyPremiumAsync(PremiumRequest request, CancellationToken cancellationToken = default)
    {
        return new PurchaseResponse(await CallAsync(HttpMethod.Post, "/buy-premium/", new()
        {
            ["username"] = request.Username,
            ["duration"] = request.Duration.ToString(CultureInfo.InvariantCulture),
            ["payment_method"] = request.PaymentMethod,
        }, purchase: true, cancellationToken: cancellationToken).ConfigureAwait(false));
    }
    // The backend also accepts POST. Both balance methods are read-only.
    public async Task<WalletBalanceResponse> WalletBalanceAsync(bool usePost = false, CancellationToken cancellationToken = default)
    {
        var raw = await CallAsync(usePost ? HttpMethod.Post : HttpMethod.Get, "/wallet-balance/", new(),
            wallet: true, cancellationToken: cancellationToken).ConfigureAwait(false);
        if (!raw.TryGetValue("address", out var address) || address.ValueKind != JsonValueKind.String
            || !raw.TryGetValue("ton", out var ton) || ton.ValueKind != JsonValueKind.String
            || !raw.TryGetValue("usdt_ton", out var usdt) || usdt.ValueKind != JsonValueKind.String)
            throw new MalformedResponseException("Wallet address and decimal balances must be strings.");
        return new WalletBalanceResponse(raw);
    }

    private async Task<Dictionary<string, JsonElement>> CallAsync(HttpMethod method, string path, Dictionary<string, string> fields,
        bool purchase = false, bool wallet = false, CancellationToken cancellationToken = default)
    {
        var headers = new Dictionary<string, string> { ["Accept"] = "application/json", ["User-Agent"] = "fragment-donor-sdk-dotnet/0.1.1" };
        if (purchase || wallet)
        {
            if (options.Credentials is null) throw new ValidationException("Wallet credentials are required.");
            foreach (var (key, value) in options.Credentials.Headers(purchase)) headers[key] = value;
        }
        var url = options.BaseUrl.AbsoluteUri.TrimEnd('/') + path;
        if (method == HttpMethod.Get && fields.Count > 0)
            url += "?" + string.Join("&", fields.Select(f => Uri.EscapeDataString(f.Key) + "=" + Uri.EscapeDataString(f.Value)));
        for (var attempt = 0; ; attempt++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            try
            {
                using var request = new HttpRequestMessage(method, url);
                foreach (var (key, value) in headers) request.Headers.TryAddWithoutValidation(key, value);
                if (method == HttpMethod.Post) request.Content = new FormUrlEncodedContent(fields);
                HttpResponseMessage response;
                try
                {
                    // Default ResponseContentRead keeps total request timeout active through body download.
                    response = await http.SendAsync(request, HttpCompletionOption.ResponseContentRead, cancellationToken).ConfigureAwait(false);
                }
                catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                { throw new OperationCanceledException("HTTP request canceled.", cancellationToken); }
                catch (OperationCanceledException) { throw new TransportTimeoutException(); }
                catch (Exception) { throw new TransportException(); }
                using (response)
                {
                    string body;
                    try { body = await response.Content.ReadAsStringAsync(cancellationToken).ConfigureAwait(false); }
                    catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
                    { throw new OperationCanceledException("HTTP request canceled.", cancellationToken); }
                    catch (OperationCanceledException) { throw new TransportTimeoutException(); }
                    catch (Exception) { throw new TransportException(); }
                    var status = (int)response.StatusCode;
                    var raw = Parse(body, status);
                    var hint = RetryAfter(response, raw);
                    var safe = Redact(raw);
                    var code = safe.TryGetValue("error_code", out var ec) && ec.ValueKind == JsonValueKind.String ? ec.GetString() : null;
                    if (purchase && raw.TryGetValue("unconfirmed", out var unconfirmed) && unconfirmed.ValueKind == JsonValueKind.True)
                        throw new PurchaseOutcomeUnknownException(status, hint, code, safe);
                    if (status == 429) throw new RateLimitException(hint, code, safe);
                    if (status == 503) throw new ServiceUnavailableException(hint, code, safe);
                    if (status == 400) throw new ValidationException("API rejected the request.", 400, hint, code, safe);
                    if (status is < 200 or >= 300 || !raw["ok"].GetBoolean()) throw new ApiException("API request failed.", status, hint, code, safe);
                    return safe;
                }
            }
            catch (SdkException error)
            {
                if (purchase)
                {
                    if (error is TransportException or MalformedResponseException
                        || error.StatusCode >= 500 || error.StatusCode is >= 300 and < 400)
                        error.MarkPurchaseOutcomeUnknown();
                    throw;
                }
                var retryable = error is TransportException or ServiceUnavailableException
                    || (error is RateLimitException && options.AutoWaitFlood)
                    || (error is ApiException && error.StatusCode >= 500);
                if (!retryable || attempt >= options.ReadOnlyRetries) throw;
                var wait = error.RetryAfter ?? (1 << attempt);
                if (wait > options.MaxWaitSeconds) throw;
                await delay(TimeSpan.FromSeconds(wait), cancellationToken).ConfigureAwait(false);
            }
        }
    }

    private static Dictionary<string, JsonElement> Parse(string body, int status)
    {
        try
        {
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.ValueKind == JsonValueKind.Object && doc.RootElement.TryGetProperty("ok", out var ok)
                && ok.ValueKind is JsonValueKind.True or JsonValueKind.False)
                return doc.RootElement.EnumerateObject().ToDictionary(p => p.Name, p => p.Value.Clone());
        }
        catch (JsonException) { }
        if (status is 429 or 503)
            return new() { ["ok"] = JsonSerializer.SerializeToElement(false) };
        throw new MalformedResponseException("API response must be a JSON object with boolean ok.", status);
    }
    private int? RetryAfter(HttpResponseMessage response, Dictionary<string, JsonElement> raw)
    {
        var hints = new List<double>();
        if (response.Headers.TryGetValues("Retry-After", out var values))
        {
            foreach (var header in values)
            {
                if (double.TryParse(header, NumberStyles.None, CultureInfo.InvariantCulture, out var seconds) && seconds >= 0 && double.IsFinite(seconds)) hints.Add(seconds);
                else if (DateTimeOffset.TryParse(header, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal, out var date))
                    hints.Add(Math.Max(0, (date - clock()).TotalSeconds));
            }
        }
        foreach (var key in new[] { "retry_after", "flood_wait" })
        {
            if (!raw.TryGetValue(key, out var value)) continue;
            double seconds;
            if ((value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out seconds))
                || (value.ValueKind == JsonValueKind.String && double.TryParse(value.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out seconds)))
                if (seconds >= 0 && double.IsFinite(seconds)) hints.Add(seconds);
        }
        return hints.Count == 0 ? null : (int)Math.Min(int.MaxValue, Math.Ceiling(hints.Max()));
    }
    private Dictionary<string, JsonElement> Redact(Dictionary<string, JsonElement> raw) =>
        raw.ToDictionary(p => p.Key, p => Clean(p.Value, p.Key));
    private JsonElement Clean(JsonElement value, string key = "")
    {
        if (Regex.IsMatch(key, @"mnemonic|cookie|secret|password|authorization|api.?key|proxy|session|token", RegexOptions.IgnoreCase))
            return JsonSerializer.SerializeToElement("[REDACTED]");
        if (value.ValueKind == JsonValueKind.Object)
            return JsonSerializer.SerializeToElement(value.EnumerateObject().ToDictionary(p => p.Name, p => Clean(p.Value, p.Name)));
        if (value.ValueKind == JsonValueKind.Array)
            return JsonSerializer.SerializeToElement(value.EnumerateArray().Select(v => Clean(v)).ToArray());
        if (value.ValueKind == JsonValueKind.String)
        {
            var text = value.GetString()!;
            foreach (var secret in secrets)
                foreach (var representation in new[] { secret, Uri.EscapeDataString(secret), WebUtility.UrlEncode(secret) })
                    text = text.Replace(representation, "[REDACTED]", StringComparison.Ordinal);
            return JsonSerializer.SerializeToElement(text);
        }
        return value.Clone();
    }
}
