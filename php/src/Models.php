<?php
declare(strict_types=1);

namespace FragmentDonor;

/** Never dump or serialize wallet credentials. They are sent to the service. */
final class Credentials
{
    public function __construct(
        private readonly string $mnemonic,
        private readonly ?string $cookie = null,
        private readonly ?string $providerKey = null,
        private readonly ?string $proxy = null,
        private readonly ?string $userAgent = null,
        private readonly ?string $walletAddress = null,
        private readonly string $walletVersion = 'auto',
    ) {
        foreach ([$mnemonic, $cookie, $providerKey, $proxy, $userAgent, $walletAddress] as $value) {
            if ($value !== null && preg_match('/[\r\n\x00]/', $value)) {
                throw new ValidationError('Credential headers must not contain control characters.');
            }
        }
        if (!in_array($walletVersion, ['auto', 'v5r1', 'v4r2', 'v3r2'], true)) {
            throw new ValidationError('Invalid wallet version.');
        }
    }

    /** @return array<string, string> */
    public function headers(bool $purchase): array
    {
        if (trim($this->mnemonic) === '' || ($purchase && trim($this->cookie ?? '') === '')) {
            throw new ValidationError($purchase ? 'Mnemonic and Fragment cookie are required.' : 'Mnemonic is required.');
        }
        // The backend validates word count and seed validity. Do not duplicate cryptography here.
        $headers = ['Mnemonic' => $this->mnemonic, 'Wallet-Version' => $this->walletVersion];
        foreach (['Wallet-Address' => $this->walletAddress, 'Api-Key' => $this->providerKey] as $name => $value) {
            if ($value !== null && $value !== '') {
                $headers[$name] = $value;
            }
        }
        if ($purchase) {
            $headers['Cookie'] = $this->cookie;
            foreach (['Proxy' => $this->proxy, 'User-Agent' => $this->userAgent] as $name => $value) {
                if ($value !== null && $value !== '') {
                    $headers[$name] = $value;
                }
            }
        }
        return $headers;
    }

    /** @return list<string> */
    public function secrets(): array
    {
        $values = [$this->mnemonic, preg_replace('/\s+/', ' ', trim($this->mnemonic)), $this->cookie,
            $this->providerKey, $this->proxy, $this->walletAddress, $this->userAgent];
        foreach (explode(';', $this->cookie ?? '') as $part) {
            if (str_contains($part, '=')) {
                [, $value] = explode('=', $part, 2);
                $values[] = trim($value);
                $values[] = trim($value, " \t\"");
                $values[] = rawurldecode(trim($value, " \t\""));
            }
        }
        $proxyText = $this->proxy !== null && !str_contains($this->proxy, '://') ? '//' . $this->proxy : $this->proxy;
        if ($proxyText !== null && ($proxy = parse_url($proxyText)) !== false) {
            foreach (['user', 'pass'] as $key) {
                if (isset($proxy[$key])) { $values[] = $proxy[$key]; $values[] = rawurldecode($proxy[$key]); }
            }
        }
        return array_values(array_unique(array_filter($values, fn ($value) => $value !== null && $value !== '')));
    }

    public function __debugInfo(): array { return ['credentials' => '[REDACTED]']; }
    public function __serialize(): array { return ['credentials' => '[REDACTED]']; }
}

final readonly class StarsRequest
{
    public function __construct(public string $username, public int $amount, public string $paymentMethod = 'usdt_ton')
    {
        Validation::username($username);
        Validation::paymentMethod($paymentMethod);
        if ($amount < 50 || $amount > 1_000_000) {
            throw new ValidationError('Stars amount must be between 50 and 1000000.');
        }
    }
}

final readonly class PremiumRequest
{
    public function __construct(public string $username, public int $duration, public string $paymentMethod = 'usdt_ton')
    {
        Validation::username($username);
        Validation::paymentMethod($paymentMethod);
        if (!in_array($duration, [3, 6, 12], true)) {
            throw new ValidationError('Premium duration must be 3, 6 or 12 months.');
        }
    }
}

final class Validation
{
    public static function username(string $username): void
    {
        if (preg_match('/^@?[A-Za-z][A-Za-z0-9_]{3,31}$/D', $username) !== 1) {
            throw new ValidationError('Invalid Telegram username.');
        }
    }
    public static function paymentMethod(string $method): void
    {
        if (!in_array($method, ['usdt_ton', 'ton'], true)) {
            throw new ValidationError('Payment method must be usdt_ton or ton.');
        }
    }
}

/** Entire JSON object is preserved, including future fields; decimal strings stay strings. */
abstract class ApiResponse
{
    public function __construct(public readonly array $raw) {}
    public function __debugInfo(): array { return ['response' => static::class, 'ok' => true]; }
}
final class UserInfoResponse extends ApiResponse
{
    public function username(): ?string { return $this->raw['username'] ?? null; }
    public function isPremium(): ?bool { return $this->raw['is_premium'] ?? null; }
}
final class PurchaseResponse extends ApiResponse
{
    public function data(): mixed { return $this->raw['data'] ?? null; }
}
final class WalletBalanceResponse extends ApiResponse
{
    public function address(): ?string { return $this->raw['address'] ?? null; }
    public function ton(): string { return $this->raw['ton']; }
    public function usdtTon(): string { return $this->raw['usdt_ton']; }
}

class SdkError extends \RuntimeException
{
    public function __construct(
        string $message,
        public readonly ?int $status = null,
        public readonly ?int $retryAfter = null,
        public readonly ?string $errorCode = null,
        public readonly array $data = [],
    ) { parent::__construct($message); }

    public function __debugInfo(): array
    {
        return ['type' => static::class, 'message' => $this->getMessage(), 'status' => $this->status,
            'retry_after' => $this->retryAfter, 'error_code' => $this->errorCode];
    }
}
class ApiError extends SdkError {}
class ValidationError extends ApiError {}
class RateLimitError extends ApiError {}
class ServiceUnavailableError extends ApiError {}
class TransportError extends SdkError {}
class TransportTimeoutError extends TransportError {}
class MalformedResponseError extends SdkError {}

final class Redactor
{
    /** @param list<string> $secrets */
    public function __construct(private readonly array $secrets = []) {}
    public function clean(mixed $value): mixed
    {
        if (is_array($value)) {
            $out = [];
            foreach ($value as $key => $item) {
                $out[$key] = is_string($key) && preg_match('/mnemonic|cookie|secret|password|authorization|api.?key|proxy|session|token/i', $key)
                    ? '[REDACTED]' : $this->clean($item);
            }
            return $out;
        }
        if (is_string($value)) {
            $secrets = $this->secrets;
            usort($secrets, fn ($a, $b) => strlen($b) <=> strlen($a));
            foreach ($secrets as $secret) {
                $value = str_replace([$secret, rawurlencode($secret), urlencode($secret)], '[REDACTED]', $value);
            }
        }
        return $value;
    }
}
