using System.Collections.ObjectModel;
using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace FragmentDonor.Sdk;

[DebuggerDisplay("WalletCredentials [REDACTED]")]
public sealed class WalletCredentials
{
    [JsonIgnore] public string Mnemonic { get; }
    [JsonIgnore] public string? Cookie { get; }
    [JsonIgnore] public string? ProviderKey { get; init; }
    [JsonIgnore] public string? Proxy { get; init; }
    [JsonIgnore] public string? UserAgent { get; init; }
    [JsonIgnore] public string? WalletAddress { get; init; }
    public string WalletVersion { get; init; } = "auto";

    public WalletCredentials(string mnemonic, string? cookie = null)
    {
        Mnemonic = mnemonic;
        Cookie = cookie;
    }
    internal Dictionary<string, string> Headers(bool purchase)
    {
        if (string.IsNullOrWhiteSpace(Mnemonic) || (purchase && string.IsNullOrWhiteSpace(Cookie)))
            throw new ValidationException(purchase ? "Mnemonic and Fragment cookie are required." : "Mnemonic is required.");
        if (!new[] { "auto", "v5r1", "v4r2", "v3r2" }.Contains(WalletVersion))
            throw new ValidationException("Invalid wallet version.");
        var headers = new Dictionary<string, string> { ["Mnemonic"] = Mnemonic, ["Wallet-Version"] = WalletVersion };
        Add("Wallet-Address", WalletAddress);
        Add("Api-Key", ProviderKey);
        if (purchase)
        {
            Add("Cookie", Cookie);
            Add("Proxy", Proxy);
            Add("User-Agent", UserAgent);
        }
        foreach (var value in headers.Values)
        {
            if (value.Any(c => c is '\r' or '\n' or '\0'))
                throw new ValidationException("Credential headers must not contain control characters.");
        }
        return headers;
        void Add(string name, string? value) { if (!string.IsNullOrEmpty(value)) headers[name] = value; }
    }
    internal IEnumerable<string> Secrets()
    {
        var values = new List<string?> { Mnemonic, Regex.Replace(Mnemonic.Trim(), @"\s+", " "), Cookie, ProviderKey, Proxy, UserAgent, WalletAddress };
        foreach (var part in (Cookie ?? "").Split(';'))
        {
            var separator = part.IndexOf('=');
            if (separator >= 0)
            {
                var value = part[(separator + 1)..].Trim();
                values.Add(value);
                values.Add(value.Trim('"'));
                values.Add(Uri.UnescapeDataString(value.Trim('"')));
            }
        }
        var proxyText = Proxy is not null && !Proxy.Contains("://", StringComparison.Ordinal) ? "http://" + Proxy : Proxy;
        if (Uri.TryCreate(proxyText, UriKind.Absolute, out var proxy) && !string.IsNullOrEmpty(proxy.UserInfo))
            foreach (var part in proxy.UserInfo.Split(':', 2)) { values.Add(part); values.Add(Uri.UnescapeDataString(part)); }
        return values.Where(s => !string.IsNullOrEmpty(s)).Select(s => s!).Distinct(StringComparer.Ordinal);
    }
    public override string ToString() => "WalletCredentials [REDACTED]";
}

[DebuggerDisplay("ClientOptions (credentials redacted)")]
public sealed class ClientOptions
{
    public Uri BaseUrl { get; init; } = new("https://fragment.donor.uz");
    [JsonIgnore] public WalletCredentials? Credentials { get; init; }
    public TimeSpan ConnectTimeout { get; init; } = TimeSpan.FromSeconds(10);
    public TimeSpan RequestTimeout { get; init; } = TimeSpan.FromSeconds(60);
    public int ReadOnlyRetries { get; init; } = 0;
    public bool AutoWaitFlood { get; init; } = false;
    public int MaxWaitSeconds { get; init; } = 60;
    public override string ToString() => "ClientOptions (credentials redacted)";
}

public sealed record StarsRequest
{
    public string Username { get; }
    public int Amount { get; }
    public string PaymentMethod { get; }
    public StarsRequest(string username, int amount, string paymentMethod = "usdt_ton")
    {
        Validation.Username(username);
        Validation.PaymentMethod(paymentMethod);
        if (amount is < 50 or > 1_000_000) throw new ValidationException("Stars amount must be between 50 and 1000000.");
        Username = username; Amount = amount; PaymentMethod = paymentMethod;
    }
}
public sealed record PremiumRequest
{
    public string Username { get; }
    public int Duration { get; }
    public string PaymentMethod { get; }
    public PremiumRequest(string username, int duration, string paymentMethod = "usdt_ton")
    {
        Validation.Username(username);
        Validation.PaymentMethod(paymentMethod);
        if (duration is not (3 or 6 or 12)) throw new ValidationException("Premium duration must be 3, 6 or 12 months.");
        Username = username; Duration = duration; PaymentMethod = paymentMethod;
    }
}
internal static class Validation
{
    internal static void Username(string username)
    {
        if (!Regex.IsMatch(username, @"\A@?[A-Za-z][A-Za-z0-9_]{3,31}\z", RegexOptions.CultureInvariant))
            throw new ValidationException("Invalid Telegram username.");
    }
    internal static void PaymentMethod(string method)
    {
        if (method is not ("usdt_ton" or "ton")) throw new ValidationException("Payment method must be usdt_ton or ton.");
    }
}

[DebuggerDisplay("ApiResponse (raw payload hidden)")]
public abstract class ApiResponse
{
    // JsonElement preserves the original JSON representation: never coerce balances to double.
    public IReadOnlyDictionary<string, JsonElement> Raw { get; }
    protected ApiResponse(Dictionary<string, JsonElement> raw) => Raw = new ReadOnlyDictionary<string, JsonElement>(raw);
    protected string? String(string key) => Raw.TryGetValue(key, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;
    public override string ToString() => $"{GetType().Name} (ok=true, raw payload hidden)";
}
public sealed class UserInfoResponse : ApiResponse
{
    internal UserInfoResponse(Dictionary<string, JsonElement> raw) : base(raw) { }
    public string? Username => String("username");
    public bool? IsPremium => Raw.TryGetValue("is_premium", out var value) && value.ValueKind is JsonValueKind.True or JsonValueKind.False ? value.GetBoolean() : null;
}
public sealed class PurchaseResponse : ApiResponse
{
    internal PurchaseResponse(Dictionary<string, JsonElement> raw) : base(raw) { }
    public JsonElement? Data => Raw.TryGetValue("data", out var value) ? value : null;
}
public sealed class WalletBalanceResponse : ApiResponse
{
    internal WalletBalanceResponse(Dictionary<string, JsonElement> raw) : base(raw) { }
    public string? Address => String("address");
    public string Ton => String("ton")!;
    public string UsdtTon => String("usdt_ton")!;
}

public class SdkException : Exception
{
    public int? StatusCode { get; }
    public int? RetryAfter { get; }
    public string? ErrorCode { get; }
    public bool PurchaseOutcomeUnknown { get; private set; }
    internal void MarkPurchaseOutcomeUnknown() => PurchaseOutcomeUnknown = true;
    // Exception.Data is IDictionary, so use a distinct property for redacted API JSON.
    public IReadOnlyDictionary<string, JsonElement> ResponseData { get; }
    public SdkException(string message, int? statusCode = null, int? retryAfter = null, string? errorCode = null,
        Dictionary<string, JsonElement>? responseData = null) : base(message)
    {
        StatusCode = statusCode; RetryAfter = retryAfter; ErrorCode = errorCode;
        ResponseData = new ReadOnlyDictionary<string, JsonElement>(responseData ?? new());
    }
}
public class ApiException : SdkException
{
    public ApiException(string message, int? statusCode = null, int? retryAfter = null, string? errorCode = null,
        Dictionary<string, JsonElement>? responseData = null) : base(message, statusCode, retryAfter, errorCode, responseData) { }
}
public sealed class ValidationException : ApiException
{
    public ValidationException(string message, int? statusCode = null, int? retryAfter = null, string? errorCode = null,
        Dictionary<string, JsonElement>? responseData = null) : base(message, statusCode, retryAfter, errorCode, responseData) { }
}
public sealed class PurchaseOutcomeUnknownException : ApiException
{
    public PurchaseOutcomeUnknownException(int? statusCode, int? retryAfter, string? errorCode,
        Dictionary<string, JsonElement> responseData)
        : base("Purchase completion is unknown; reconcile before another purchase.", statusCode, retryAfter, errorCode, responseData)
    { MarkPurchaseOutcomeUnknown(); }
}
public sealed class RateLimitException : ApiException
{
    public RateLimitException(int? retryAfter, string? errorCode, Dictionary<string, JsonElement> data)
        : base("API rate limit exceeded.", 429, retryAfter, errorCode, data) { }
}
public sealed class ServiceUnavailableException : ApiException
{
    public ServiceUnavailableException(int? retryAfter, string? errorCode, Dictionary<string, JsonElement> data)
        : base("API temporarily unavailable.", 503, retryAfter, errorCode, data) { }
}
public class TransportException : SdkException
{
    public TransportException() : base("HTTP transport failed; purchase completion may be unknown.") { }
}
public sealed class TransportTimeoutException : TransportException
{
    public override string Message => "HTTP request timed out; purchase completion may be unknown.";
}
public sealed class MalformedResponseException : SdkException
{
    public MalformedResponseException(string message, int? statusCode = null) : base(message, statusCode) { }
}
