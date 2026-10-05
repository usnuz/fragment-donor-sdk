<?php

declare(strict_types=1);
require __DIR__ . '/../vendor/autoload.php';
use FragmentDonor\{Client, Credentials, StarsRequest, PremiumRequest, RateLimitError, ServiceUnavailableError};

// Read-only by default. Never print or dump client credentials.
$client = new Client(credentials: new Credentials(
    mnemonic: getenv('FRAGMENT_MNEMONIC') ?: '',
    cookie: getenv('FRAGMENT_COOKIE') ?: '',
    providerKey: getenv('TONCONSOLE_API_KEY') ?: null,
));
try {
    $username = getenv('FRAGMENT_USERNAME') ?: 'durov';
    $user = $client->getUserInfo($username);
    echo 'Username: ' . $user->username() . PHP_EOL;
    if (getenv('FRAGMENT_MNEMONIC')) {
        $wallet = $client->walletBalance();
        echo 'TON balance: ' . $wallet->ton() . PHP_EOL;
        if (getenv('FRAGMENT_ALLOW_PURCHASES') === 'yes') {
            // Exactly one deliberate real-money gift, never both or a blind retry.
            $kind = getenv('FRAGMENT_PURCHASE_KIND');
            if ($kind === 'stars') {
                $client->buyStars(new StarsRequest($username, 50));
            } elseif ($kind === 'premium') {
                $client->buyPremium(new PremiumRequest($username, 3));
            } else {
                throw new LogicException('Select FRAGMENT_PURCHASE_KIND=stars or premium explicitly.');
            }
        }
    }
} catch (RateLimitError | ServiceUnavailableError $error) {
    echo 'Retry later: ' . ($error->retryAfter ?? 5) . ' seconds.' . PHP_EOL;
}
