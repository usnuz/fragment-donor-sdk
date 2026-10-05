<?php

declare(strict_types=1);

// Checks both standalone Composer archives and the repository-root PHP archive.
if (!isset($argv[1]) || !class_exists(ZipArchive::class)) {
    throw new RuntimeException('Usage: php tests/check-package.php archive.zip (requires ext-zip).');
}
$archive = new ZipArchive();
if ($archive->open($argv[1]) !== true) {
    throw new RuntimeException('Cannot open built package.');
}
try {
    $manifest = json_decode($archive->getFromName('composer.json') ?: '', true, 512, JSON_THROW_ON_ERROR);
    $monorepo = ($manifest['autoload']['classmap'] ?? null) === ['php/src/'];
    if (($manifest['name'] ?? null) !== 'fragment-donor/sdk') {
        throw new RuntimeException('Unexpected Composer package identity.');
    }
    $allowed = $monorepo
        ? ['CHANGELOG.md', 'LICENSE', 'README.md', 'composer.json', 'php/CHANGELOG.md', 'php/LICENSE', 'php/README.md',
            'php/src/Client.php', 'php/src/Models.php', 'php/src/Transport.php']
        : ['CHANGELOG.md', 'LICENSE', 'README.md', 'composer.json', 'examples/quickstart.php',
            'src/Client.php', 'src/Models.php', 'src/Transport.php'];
    $rules = [
        '/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/',
        '/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{60,})\b/',
        '/\b\d{8,12}:[A-Za-z0-9_-]{35}\b/',
        '/https?:\/\/(?!SYNTHETIC)[^\s\/@:]+:[^\s\/@]+@/',
        '/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/',
    ];
    $seen = [];
    for ($index = 0; $index < $archive->numFiles; $index++) {
        $name = $archive->getNameIndex($index);
        if (!is_string($name) || !in_array($name, $allowed, true) || isset($seen[$name])) {
            throw new RuntimeException('Unexpected or duplicate package member; content withheld.');
        }
        $seen[$name] = true;
        $contents = $archive->getFromIndex($index);
        if (!is_string($contents)) {
            throw new RuntimeException('Cannot inspect package member.');
        }
        foreach ($rules as $rule) {
            if (preg_match($rule, $contents) === 1) {
                throw new RuntimeException('Potential credential in package member; content withheld.');
            }
        }
    }
    if (count($seen) !== count($allowed)) {
        throw new RuntimeException('Required package member missing.');
    }
    echo 'PASS Composer package identity, exact member allowlist and known-token secret scan (' . count($seen) . " files).\n";
} finally {
    $archive->close();
}
