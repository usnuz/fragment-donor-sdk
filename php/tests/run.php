<?php
declare(strict_types=1);
require __DIR__ . '/bootstrap.php';

use FragmentDonor\{Client, Credentials, StarsRequest, PremiumRequest, Transport, HttpRequest, HttpResponse,
    SdkError, ValidationError, RateLimitError, ServiceUnavailableError, TransportTimeoutError, TransportError, MalformedResponseError};

$fixture = json_decode(file_get_contents(__DIR__ . '/../../contract/fixtures.json'), true, 512, JSON_THROW_ON_ERROR);
$count = 0;
function check(bool $condition, string $message): void { if (!$condition) { throw new RuntimeException($message); } }
function test(string $name, Closure $fn): void {
    global $count;
    $fn(); ++$count; echo "PASS $name\n";
}
function expectError(string $type, Closure $fn): SdkError {
    try { $fn(); } catch (SdkError $error) { check($error instanceof $type, 'Wrong error type'); return $error; }
    throw new RuntimeException('Expected SDK error');
}
final class FakeTransport implements Transport {
    public array $requests = [];
    public function __construct(public array $queue) {}
    public function send(HttpRequest $request): HttpResponse {
        $this->requests[] = $request;
        $next = array_shift($this->queue);
        if ($next instanceof Throwable) { throw $next; }
        if (!$next instanceof HttpResponse) { throw new RuntimeException('Missing mock response'); }
        return $next;
    }
}
function response(string $name, int $status = 200, array $headers = []): HttpResponse {
    global $fixture;
    return new HttpResponse($status, $headers, json_encode($fixture['responses'][$name], JSON_THROW_ON_ERROR));
}
function creds(): Credentials {
    global $fixture;
    return new Credentials($fixture['credentials']['mnemonic'], $fixture['credentials']['cookie'],
        $fixture['credentials']['provider_key'], 'https://SYNTHETIC_PROXY_USER:SYNTHETIC_PROXY_PASSWORD@proxy.invalid',
        'SYNTHETIC_FRAGMENT_AGENT', 'SYNTHETIC_ADDRESS', 'v5r1');
}
test('GET user info query, no service auth or credentials, future fields retained', function () {
    $http = new FakeTransport([response('user_info')]);
    $result = (new Client(credentials: creds(), transport: $http))->getUserInfo('@durov');
    $r = $http->requests[0];
    check($r->method === 'GET' && $r->url === 'https://fragment.donor.uz/get-user-info/?username=%40durov', 'Wrong user query');
    foreach (['Mnemonic', 'Cookie', 'Authorization', 'X-Api-Key'] as $name) { check(!isset($r->headers[$name]), 'Leaked unnecessary headers'); }
    check($result->username() === 'durov' && !$result->isPremium() && $result->raw['future_field']['kept'], 'Response lost fields');
});
test('POST Stars uses exact form, purchase headers and safe debug', function () {
    global $fixture;
    $http = new FakeTransport([response('purchase')]);
    $client = new Client(credentials: creds(), transport: $http);
    $result = $client->buyStars(new StarsRequest('@durov', 50, 'ton'));
    $r = $http->requests[0];
    check($r->method === 'POST' && $r->url === 'https://fragment.donor.uz/buy-stars/', 'Wrong Stars method/path');
    check($r->body === 'username=%40durov&amount=50&payment_method=ton', 'Wrong Stars form');
    check($r->headers['Content-Type'] === 'application/x-www-form-urlencoded', 'Wrong content type');
    check($r->headers['Mnemonic'] === $fixture['credentials']['mnemonic'] && $r->headers['Cookie'] === $fixture['credentials']['cookie'], 'Missing purchase credentials');
    check($r->headers['Api-Key'] === $fixture['credentials']['provider_key'] && $r->headers['Wallet-Version'] === 'v5r1'
        && $r->headers['Wallet-Address'] === 'SYNTHETIC_ADDRESS' && isset($r->headers['Proxy']) && $r->headers['User-Agent'] === 'SYNTHETIC_FRAGMENT_AGENT', 'Wrong optional headers');
    check($result->raw['future_field'] === 'preserve', 'Purchase response lost fields');
    ob_start(); var_dump($client, creds(), $r); $dump = ob_get_clean();
    foreach ($fixture['credentials'] as $secret) { check(!str_contains($dump, $secret), 'Credential debug leak'); }
});
test('POST Premium exact form and path', function () {
    $http = new FakeTransport([response('purchase')]);
    (new Client(credentials: creds(), transport: $http))->buyPremium(new PremiumRequest('durov', 12));
    check($http->requests[0]->url === 'https://fragment.donor.uz/buy-premium/' && $http->requests[0]->method === 'POST'
        && $http->requests[0]->body === 'username=durov&duration=12&payment_method=usdt_ton', 'Wrong Premium request');
});
test('wallet GET and POST retain decimal strings and exclude purchase-only headers', function () {
    foreach (['GET', 'POST'] as $method) {
        $http = new FakeTransport([response('wallet_balance')]);
        $result = (new Client(credentials: creds(), transport: $http))->walletBalance($method);
        $r = $http->requests[0];
        check($r->method === $method && $r->url === 'https://fragment.donor.uz/wallet-balance/', 'Wrong wallet request');
        check(!isset($r->headers['Cookie']) && !isset($r->headers['Proxy']) && isset($r->headers['Mnemonic'], $r->headers['Api-Key']), 'Wrong wallet credential scope');
        check($result->ton() === '2.500000001' && $result->usdtTon() === '9007199254740993.01' && $result->raw['future_field'] === 'preserve', 'Decimal precision lost');
    }
});
test('local validation rejects values before transport', function () {
    $http = new FakeTransport([]);
    $client = new Client(transport: $http);
    foreach ([fn () => new StarsRequest('durov', 49), fn () => new StarsRequest('durov', 1000001), fn () => new PremiumRequest('durov', 1),
        fn () => new StarsRequest('durov', 50, 'card'), fn () => $client->getUserInfo('invalid!'), fn () => $client->walletBalance(),
        fn () => new Credentials("bad\r\nheader"), fn () => new Client(baseUrl: 'https://SYNTHETIC_USER:SYNTHETIC_PASSWORD@example.invalid'),
        fn () => new Client(transport: $http, requestTimeout: INF), fn () => new Client(transport: $http, connectTimeout: NAN)] as $call) {
        expectError(ValidationError::class, $call);
    }
    check(count($http->requests) === 0, 'Validation reached transport');
});
test('400, false ok, malformed JSON and malformed shape are typed', function () {
    foreach ([[response('validation', 400), ValidationError::class], [response('upstream_error'), FragmentDonor\ApiError::class],
        [new HttpResponse(200, [], 'invalid JSON'), MalformedResponseError::class], [new HttpResponse(200, [], '[true]'), MalformedResponseError::class]] as [$r, $type]) {
        $http = new FakeTransport([$r]); expectError($type, fn () => (new Client(transport: $http))->getUserInfo('durov'));
    }
});
test('429 hint takes safe maximum of seconds/date/JSON; 503 typed even HTML', function () {
    $http = new FakeTransport([response('flood_wait', 429, ['Retry-After' => '50'])]);
    $error = expectError(RateLimitError::class, fn () => (new Client(transport: $http))->getUserInfo('durov'));
    check($error->retryAfter === 50 && $error->errorCode === 'FLOOD_WAIT', 'Wrong flood hint');
    $http = new FakeTransport([response('flood_wait', 429, ['Retry-After' => 'Tue, 01 Jan 2030 00:01:00 GMT'])]);
    $error = expectError(RateLimitError::class, fn () => (new Client(transport: $http, clock: fn () => 1893456000))->getUserInfo('durov'));
    check($error->retryAfter === 60, 'HTTP-date not understood');
    $http = new FakeTransport([new HttpResponse(503, ['Retry-After' => '5'], '<html>unavailable</html>')]);
    check(expectError(ServiceUnavailableError::class, fn () => (new Client(transport: $http))->getUserInfo('durov'))->retryAfter === 5, 'Wrong 503 hint');
});
test('purchases never retry 429, 503, 500, timeout, reset or malformed JSON', function () {
    foreach ([response('flood_wait', 429), response('unavailable', 503), response('validation', 500), new TransportTimeoutError('private'),
        new RuntimeException('private reset'), new HttpResponse(200, [], 'invalid')] as $first) {
        foreach (['stars', 'premium'] as $operation) {
            $http = new FakeTransport([$first, response('purchase')]);
            $client = new Client(credentials: creds(), transport: $http, readOnlyRetries: 2, autoWaitFlood: true, sleeper: fn () => null);
            expectError(SdkError::class, fn () => $operation === 'stars' ? $client->buyStars(new StarsRequest('durov', 50)) : $client->buyPremium(new PremiumRequest('durov', 3)));
            check(count($http->requests) === 1, 'Duplicate purchase!');
        }
    }
});
test('read-only retries are opt-in, capped and do not exceed max wait', function () {
    $waits = [];
    $http = new FakeTransport([response('flood_wait', 429), response('user_info')]);
    $client = new Client(transport: $http, readOnlyRetries: 2, autoWaitFlood: true, sleeper: function ($s) use (&$waits) { $waits[] = $s; });
    $client->getUserInfo('durov'); check(count($http->requests) === 2 && $waits === [42], 'Opt-in retry failed');
    $http = new FakeTransport([response('flood_wait', 429), response('user_info')]);
    expectError(RateLimitError::class, fn () => (new Client(transport: $http, readOnlyRetries: 2))->getUserInfo('durov'));
    check(count($http->requests) === 1, 'Flood auto wait was not opted in');
    $http = new FakeTransport([new HttpResponse(503, ['Retry-After' => '61'], '{}'), response('user_info')]);
    expectError(ServiceUnavailableError::class, fn () => (new Client(transport: $http, readOnlyRetries: 2))->getUserInfo('durov'));
    check(count($http->requests) === 1, 'Exceeded maximum wait');
    $http = new FakeTransport([response('unavailable', 503), response('unavailable', 503), response('unavailable', 503), response('user_info')]);
    expectError(ServiceUnavailableError::class, fn () => (new Client(transport: $http, readOnlyRetries: 2, sleeper: fn () => null))->getUserInfo('durov'));
    check(count($http->requests) === 3, 'Retries not bounded');
});
test('transport errors discard unsafe original message and API errors redact secrets', function () {
    global $fixture;
    $secret = $fixture['credentials']['mnemonic'];
    $http = new FakeTransport([new RuntimeException($secret)]);
    $error = expectError(TransportError::class, fn () => (new Client(credentials: creds(), transport: $http))->walletBalance());
    check(!str_contains((string) $error, $secret) && $error->getPrevious() === null, 'Transport exception leaked');
    $http = new FakeTransport([new HttpResponse(400, [], json_encode(['ok' => false, 'error' => $secret, 'nested' => ['cookie' => 'NEW_UNKNOWN_SECRET']]))]);
    $error = expectError(ValidationError::class, fn () => (new Client(credentials: creds(), transport: $http))->walletBalance());
    check(!str_contains(json_encode($error->data), $secret) && $error->data['nested']['cookie'] === '[REDACTED]', 'API error leaked');
});
test('partial cookie token, proxy password, normalized or encoded mnemonic echoes are redacted', function () {
    global $fixture;
    $secret = $fixture['credentials']['mnemonic'];
    $credentials = new Credentials(str_replace(' ', '  ', $secret), 'stel_ssid=SYNTHETIC_COOKIE_TOKEN',
        proxy: 'https://SYNTHETIC_PROXY_USER:SYNTHETIC_PROXY_PASSWORD@proxy.invalid');
    $echo = $secret . ' ' . rawurlencode($secret) . ' SYNTHETIC_COOKIE_TOKEN SYNTHETIC_PROXY_PASSWORD';
    $http = new FakeTransport([new HttpResponse(400, [], json_encode(['ok' => false, 'error' => $echo]))]);
    $error = expectError(ValidationError::class, fn () => (new Client(credentials: $credentials, transport: $http))->walletBalance());
    foreach ([$secret, rawurlencode($secret), 'SYNTHETIC_COOKIE_TOKEN', 'SYNTHETIC_PROXY_PASSWORD'] as $value) {
        check(!str_contains(json_encode($error->data), $value), 'Partial credential echo leaked');
    }
});
echo "$count tests passed; no real HTTP requests or purchases made.\n";
