<?php

declare(strict_types=1);
// Run with path to an extracted Composer archive whose dependencies/autoload were installed.
if (!isset($argv[1])) {
    throw new RuntimeException('Usage: php tests/package-smoke.php /path/to/extracted-package');
}
require $argv[1] . '/vendor/autoload.php';

use FragmentDonor\{Client, Credentials, Transport, HttpRequest, HttpResponse, ValidationError, StarsRequest, PremiumRequest,
    PurchaseOutcomeUnknownError};

final class SmokeTransport implements Transport
{
    public int $calls = 0;
    public function send(HttpRequest $request): HttpResponse
    {
        $this->calls++;
        if (str_contains($request->url, '/wallet-balance/')) {
            return new HttpResponse(200, [], '{"ok":true,"address":"SYNTHETIC_ADDRESS","ton":"2.500000001","usdt_ton":"9007199254740993.01"}');
        }
        if (str_contains($request->url, '/buy-')) {
            if ($request->method !== 'POST' || !isset($request->headers['Cookie'], $request->headers['Mnemonic'])
                || $request->headers['Content-Type'] !== 'application/x-www-form-urlencoded') {
                throw new RuntimeException('Packaged purchase mapping failed.');
            }
            return new HttpResponse(400, [], '{"ok":false,"unconfirmed":true,"transient":true,"tx_hash":"SYNTHETIC_TX_HASH","info":"SYNTHETIC_COOKIE_TOKEN"}');
        }
        return new HttpResponse(200, [], '{"ok":true,"username":"durov","is_premium":false,"future_field":"kept"}');
    }
}
$transport = new SmokeTransport();
$client = new Client(
    credentials: new Credentials('SYNTHETIC_NOT_A_REAL_MNEMONIC', 'stel_ssid=SYNTHETIC_COOKIE_TOKEN'),
    transport: $transport,
    readOnlyRetries: 2,
    autoWaitFlood: true,
    sleeper: fn () => null
);
$result = $client->getUserInfo('durov');
if ($result->username() !== 'durov' || $result->raw['future_field'] !== 'kept') {
    throw new RuntimeException('Built-package smoke failed.');
}
$wallet = $client->walletBalance();
if ($wallet->ton() !== '2.500000001' || $wallet->usdtTon() !== '9007199254740993.01') {
    throw new RuntimeException('Packaged decimals changed.');
}
foreach ([fn () => $client->buyStars(new StarsRequest('durov', 50)), fn () => $client->buyPremium(new PremiumRequest('durov', 3))] as $purchase) {
    try {
        $purchase();
        throw new RuntimeException('Expected unknown purchase result.');
    } catch (PurchaseOutcomeUnknownError $error) {
        if (!$error->purchaseOutcomeUnknown || $error->data['tx_hash'] !== 'SYNTHETIC_TX_HASH'
            || str_contains(json_encode($error->data), 'SYNTHETIC_COOKIE_TOKEN')) {
            throw new RuntimeException('Packaged uncertainty/redaction failed.');
        }
    }
}
if ($transport->calls !== 4) {
    throw new RuntimeException('Packaged purchase duplicated.');
}
echo "PASS installed Composer archive four-operation/uncertainty/decimal smoke; no network calls.\n";

final class SecretEchoTransport implements Transport
{
    public function send(HttpRequest $request): HttpResponse
    {
        return new HttpResponse(400, [], '{"ok":false,"error":"SYNTHETIC_COOKIE_TOKEN"}');
    }
}
try {
    (new Client(
        credentials: new Credentials('SYNTHETIC_NOT_A_REAL_MNEMONIC', 'stel_ssid=SYNTHETIC_COOKIE_TOKEN'),
        transport: new SecretEchoTransport()
    ))->walletBalance();
    throw new RuntimeException('Expected package error.');
} catch (ValidationError $error) {
    if (str_contains(json_encode($error->data), 'SYNTHETIC_COOKIE_TOKEN')) {
        throw new RuntimeException('Packaged redaction failed.');
    }
}
echo "PASS packaged partial-credential redaction smoke.\n";
