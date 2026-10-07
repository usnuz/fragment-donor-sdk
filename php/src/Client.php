<?php

declare(strict_types=1);

namespace FragmentDonor;

final class Client
{
    private readonly Transport $transport;
    private readonly \Closure $sleeper;
    private readonly \Closure $clock;
    private readonly Redactor $redactor;
    private readonly string $baseUrl;

    /** Read-only retries default to zero. Purchases never retry, regardless of these settings. */
    public function __construct(
        ?Credentials $credentials = null,
        string $baseUrl = 'https://fragment.donor.uz',
        ?Transport $transport = null,
        float $connectTimeout = 10,
        float $requestTimeout = 60,
        private readonly int $readOnlyRetries = 0,
        private readonly bool $autoWaitFlood = false,
        private readonly int $maxWaitSeconds = 60,
        ?\Closure $sleeper = null,
        ?\Closure $clock = null,
    ) {
        $parts = parse_url($baseUrl);
        if ($parts === false || !isset($parts['host'], $parts['scheme']) || isset($parts['user']) || isset($parts['pass'])
            || isset($parts['query']) || isset($parts['fragment']) || !in_array($parts['scheme'], ['https', 'http'], true)
            || ($parts['scheme'] === 'http' && !in_array($parts['host'], ['localhost', '127.0.0.1', '[::1]'], true))) {
            throw new ValidationError('Base URL must use HTTPS (or HTTP on loopback), without user info, query or fragment.');
        }
        if ($readOnlyRetries < 0 || $readOnlyRetries > 2 || $maxWaitSeconds < 0 || $maxWaitSeconds > 60) {
            throw new ValidationError('Read-only retries must be 0..2; maximum wait must be 0..60 seconds.');
        }
        if (!is_finite($connectTimeout) || !is_finite($requestTimeout) || $connectTimeout <= 0 || $requestTimeout <= 0) {
            throw new ValidationError('Timeouts must be positive and finite.');
        }
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->credentials = $credentials;
        $this->transport = $transport ?? new CurlTransport($connectTimeout, $requestTimeout);
        $this->sleeper = $sleeper ?? static fn (int $seconds) => sleep($seconds);
        $this->clock = $clock ?? static fn (): int => time();
        $this->redactor = new Redactor($credentials?->secrets() ?? []);
    }
    private readonly ?Credentials $credentials;
    public function __debugInfo(): array
    {
        return ['base_url' => $this->baseUrl, 'credentials' => '[REDACTED]', 'transport' => '[REDACTED]'];
    }

    public function getUserInfo(string $username): UserInfoResponse
    {
        Validation::username($username);
        $data = $this->call('GET', '/get-user-info/', ['username' => $username]);
        if (!is_string($data['username'] ?? null) || !is_bool($data['is_premium'] ?? null)) {
            throw new MalformedResponseError('User response has invalid fields.');
        }
        return new UserInfoResponse($data);
    }
    public function buyStars(StarsRequest $request): PurchaseResponse
    {
        return new PurchaseResponse($this->call(
            'POST',
            '/buy-stars/',
            ['username' => $request->username, 'amount' => (string) $request->amount, 'payment_method' => $request->paymentMethod],
            true
        ));
    }
    public function buyPremium(PremiumRequest $request): PurchaseResponse
    {
        return new PurchaseResponse($this->call(
            'POST',
            '/buy-premium/',
            ['username' => $request->username, 'duration' => (string) $request->duration, 'payment_method' => $request->paymentMethod],
            true
        ));
    }
    /** Backend accepts GET and POST; GET is the default, and both are read-only. */
    public function walletBalance(string $method = 'GET'): WalletBalanceResponse
    {
        if (!in_array($method, ['GET', 'POST'], true)) {
            throw new ValidationError('Wallet balance method must be GET or POST.');
        }
        $data = $this->call($method, '/wallet-balance/', [], false, true);
        if (!is_string($data['address'] ?? null) || !is_string($data['ton'] ?? null) || !is_string($data['usdt_ton'] ?? null)) {
            throw new MalformedResponseError('Wallet address and decimal balances must be strings.');
        }
        return new WalletBalanceResponse($data);
    }

    private function call(string $method, string $path, array $fields = [], bool $purchase = false, bool $wallet = false): array
    {
        $headers = ['Accept' => 'application/json', 'User-Agent' => 'fragment-donor-sdk-php/0.1.2'];
        if ($purchase || $wallet) {
            if ($this->credentials === null) {
                throw new ValidationError('Wallet credentials are required.');
            }
            $headers = array_merge($headers, $this->credentials->headers($purchase));
        }
        $url = $this->baseUrl . $path;
        $body = null;
        if ($method === 'GET' && $fields !== []) {
            $url .= '?' . http_build_query($fields, '', '&', PHP_QUERY_RFC3986);
        }
        if ($method === 'POST') {
            $headers['Content-Type'] = 'application/x-www-form-urlencoded';
            $body = http_build_query($fields, '', '&', PHP_QUERY_RFC3986);
        }
        $request = new HttpRequest($method, $url, $headers, $body);
        for ($attempt = 0; ; $attempt++) {
            try {
                try {
                    $response = $this->transport->send($request);
                } catch (TransportTimeoutError) {
                    throw new TransportTimeoutError('HTTP request timed out; purchase completion may be unknown.');
                } catch (\Throwable) {
                    throw new TransportError('HTTP transport failed; purchase completion may be unknown.');
                }
                $data = $this->decode($response);
                $hint = $this->retryAfter($response, $data);
                $safe = $this->redactor->clean($data);
                $code = isset($safe['error_code']) && is_string($safe['error_code']) ? $safe['error_code'] : null;
                if ($purchase && ($data['unconfirmed'] ?? null) === true) {
                    throw new PurchaseOutcomeUnknownError(status: $response->status, retryAfter: $hint, errorCode: $code, data: $safe);
                }
                if ($response->status === 429) {
                    throw new RateLimitError('API rate limit exceeded.', 429, $hint, $code, $safe);
                }
                if ($response->status === 503) {
                    throw new ServiceUnavailableError('API temporarily unavailable.', 503, $hint, $code, $safe);
                }
                if ($response->status === 400) {
                    throw new ValidationError('API rejected the request.', 400, $hint, $code, $safe);
                }
                if ($response->status < 200 || $response->status >= 300 || !$data['ok']) {
                    throw new ApiError('API request failed.', $response->status, $hint, $code, $safe);
                }
                return $safe;
            } catch (SdkError $error) {
                if ($purchase) {
                    if ($error instanceof TransportError || $error instanceof MalformedResponseError
                        || ($error->status ?? 0) >= 500 || (($error->status ?? 0) >= 300 && ($error->status ?? 0) < 400)) {
                        $error = $error->asPurchaseOutcomeUnknown();
                    }
                    throw $error;
                }
                $retryable = $error instanceof TransportError || $error instanceof ServiceUnavailableError
                    || ($error instanceof RateLimitError && $this->autoWaitFlood)
                    || ($error instanceof ApiError && ($error->status ?? 0) >= 500);
                if (!$retryable || $attempt >= $this->readOnlyRetries) {
                    throw $error;
                }
                $wait = $error->retryAfter ?? (1 << $attempt);
                if ($wait > $this->maxWaitSeconds) {
                    throw $error;
                }
                ($this->sleeper)($wait);
            }
        }
    }

    private function decode(HttpResponse $response): array
    {
        try {
            $data = json_decode($response->body, true, 512, JSON_THROW_ON_ERROR | JSON_BIGINT_AS_STRING);
        } catch (\JsonException) {
            // Preserve structured rate-limit types even if a reverse proxy supplies HTML.
            if (in_array($response->status, [429, 503], true)) {
                return ['ok' => false];
            }
            throw new MalformedResponseError('API returned invalid JSON.', $response->status);
        }
        if (!is_array($data) || array_is_list($data) || !is_bool($data['ok'] ?? null)) {
            if (in_array($response->status, [429, 503], true)) {
                return ['ok' => false];
            }
            throw new MalformedResponseError('API response must be a JSON object with boolean ok.', $response->status);
        }
        return $data;
    }
    private function retryAfter(HttpResponse $response, array $data): ?int
    {
        $values = [];
        if (($header = $response->header('Retry-After')) !== null) {
            $header = trim($header);
            if (preg_match('/^\d+$/D', $header)) {
                $values[] = min(PHP_INT_MAX, (float) $header);
            } elseif (($date = strtotime($header)) !== false) {
                $values[] = max(0, $date - ($this->clock)());
            }
        }
        foreach (['retry_after', 'flood_wait'] as $key) {
            $value = $data[$key] ?? null;
            if ((is_int($value) || is_float($value) || is_string($value)) && is_numeric($value) && (float) $value >= 0 && is_finite((float) $value)) {
                $values[] = min(PHP_INT_MAX, ceil((float) $value));
            }
        }
        return $values === [] ? null : (int) min(PHP_INT_MAX, max($values));
    }
}
