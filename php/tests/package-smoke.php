<?php
declare(strict_types=1);
// Run with path to an extracted Composer archive whose dependencies/autoload were installed.
if (!isset($argv[1])) { throw new RuntimeException('Usage: php tests/package-smoke.php /path/to/extracted-package'); }
require $argv[1] . '/vendor/autoload.php';

use FragmentDonor\{Client, Credentials, Transport, HttpRequest, HttpResponse, ValidationError};

final class SmokeTransport implements Transport
{
    public function send(HttpRequest $request): HttpResponse
    {
        return new HttpResponse(200, [], '{"ok":true,"username":"durov","is_premium":false,"future_field":"kept"}');
    }
}
$result = (new Client(transport: new SmokeTransport()))->getUserInfo('durov');
if ($result->username() !== 'durov' || $result->raw['future_field'] !== 'kept') { throw new RuntimeException('Built-package smoke failed.'); }
echo "PASS installed Composer archive smoke; no network calls.\n";

final class SecretEchoTransport implements Transport
{
    public function send(HttpRequest $request): HttpResponse
    {
        return new HttpResponse(400, [], '{"ok":false,"error":"SYNTHETIC_COOKIE_TOKEN"}');
    }
}
try {
    (new Client(credentials: new Credentials('SYNTHETIC_NOT_A_REAL_MNEMONIC', 'stel_ssid=SYNTHETIC_COOKIE_TOKEN'),
        transport: new SecretEchoTransport()))->walletBalance();
    throw new RuntimeException('Expected package error.');
} catch (ValidationError $error) {
    if (str_contains(json_encode($error->data), 'SYNTHETIC_COOKIE_TOKEN')) { throw new RuntimeException('Packaged redaction failed.'); }
}
echo "PASS packaged partial-credential redaction smoke.\n";
