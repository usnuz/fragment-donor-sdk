<?php
declare(strict_types=1);
require __DIR__ . '/../vendor/autoload.php';
use FragmentDonor\{Client, Credentials, RateLimitError, ServiceUnavailableError};

// Read-only example. Never print or dump client credentials.
$client = new Client(credentials: new Credentials(
    mnemonic: getenv('FRAGMENT_MNEMONIC') ?: '',
    cookie: getenv('FRAGMENT_COOKIE') ?: '',
    providerKey: getenv('TONCONSOLE_API_KEY') ?: null,
));
try {
    $user = $client->getUserInfo('durov');
    echo 'Username: ' . $user->username() . PHP_EOL;
    $wallet = $client->walletBalance();
    echo 'TON balance: ' . $wallet->ton() . PHP_EOL;
} catch (RateLimitError | ServiceUnavailableError $error) {
    echo 'Retry later: ' . ($error->retryAfter ?? 5) . ' seconds.' . PHP_EOL;
}
