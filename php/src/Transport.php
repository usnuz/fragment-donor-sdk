<?php
declare(strict_types=1);

namespace FragmentDonor;

final readonly class HttpRequest
{
    /** @param array<string, string> $headers */
    public function __construct(public string $method, public string $url, public array $headers, public ?string $body = null) {}
    public function __debugInfo(): array
    {
        return ['method' => $this->method, 'url' => $this->url, 'headers' => '[REDACTED]', 'body' => '[REDACTED]'];
    }
}
final readonly class HttpResponse
{
    /** @param array<string, string> $headers */
    public function __construct(public int $status, public array $headers, public string $body) {}
    public function header(string $name): ?string
    {
        foreach ($this->headers as $key => $value) {
            if (strcasecmp($key, $name) === 0) { return $value; }
        }
        return null;
    }
    public function __debugInfo(): array { return ['status' => $this->status, 'body' => '[REDACTED]']; }
}
interface Transport
{
    /** Must perform one request only, without redirects, hidden retries or credential logging. */
    public function send(HttpRequest $request): HttpResponse;
}
final class CurlTransport implements Transport
{
    public function __construct(private readonly float $connectTimeout = 10, private readonly float $requestTimeout = 60)
    {
        if (!is_finite($connectTimeout) || !is_finite($requestTimeout) || $connectTimeout <= 0 || $requestTimeout <= 0) {
            throw new ValidationError('Timeouts must be positive and finite.');
        }
    }
    public function send(HttpRequest $request): HttpResponse
    {
        if (!extension_loaded('curl')) { throw new TransportError('The PHP cURL extension is required.'); }
        $curl = curl_init($request->url);
        if ($curl === false) { throw new TransportError('Unable to initialize HTTP transport.'); }
        $headers = [];
        $requestHeaders = [];
        foreach ($request->headers as $name => $value) { $requestHeaders[] = $name . ': ' . $value; }
        try {
            curl_setopt_array($curl, [
                CURLOPT_CUSTOMREQUEST => $request->method,
                CURLOPT_HTTPHEADER => $requestHeaders,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_MAXREDIRS => 0,
                CURLOPT_CONNECTTIMEOUT_MS => (int) ceil($this->connectTimeout * 1000),
                CURLOPT_TIMEOUT_MS => (int) ceil($this->requestTimeout * 1000),
                CURLOPT_SSL_VERIFYPEER => true,
                CURLOPT_SSL_VERIFYHOST => 2,
                CURLOPT_HEADERFUNCTION => static function ($handle, string $line) use (&$headers): int {
                    if (str_starts_with($line, 'HTTP/')) { $headers = []; }
                    elseif (str_contains($line, ':')) {
                        [$key, $value] = explode(':', $line, 2);
                        $headers[trim($key)] = trim($value);
                    }
                    return strlen($line);
                },
            ]);
            if (defined('CURLOPT_PROTOCOLS_STR')) { curl_setopt($curl, CURLOPT_PROTOCOLS_STR, 'http,https'); }
            else { curl_setopt($curl, CURLOPT_PROTOCOLS, CURLPROTO_HTTP | CURLPROTO_HTTPS); }
            if ($request->body !== null) { curl_setopt($curl, CURLOPT_POSTFIELDS, $request->body); }
            $body = curl_exec($curl);
            if ($body === false) {
                if (curl_errno($curl) === CURLE_OPERATION_TIMEDOUT) { throw new TransportTimeoutError('HTTP request timed out; purchase completion may be unknown.'); }
                throw new TransportError('HTTP transport failed; purchase completion may be unknown.');
            }
            return new HttpResponse((int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE), $headers, $body);
        } finally { curl_close($curl); }
    }
}
