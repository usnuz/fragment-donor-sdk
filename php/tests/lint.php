<?php
declare(strict_types=1);
$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(__DIR__ . '/..', FilesystemIterator::SKIP_DOTS));
$failed = false;
foreach ($iterator as $file) {
    if ($file->getExtension() !== 'php' || preg_match('~[\\\\/](\.tools|vendor|dist)[\\\\/]~', $file->getPathname())) { continue; }
    passthru(escapeshellarg(PHP_BINARY) . ' -l ' . escapeshellarg($file->getPathname()), $code);
    $failed = $failed || $code !== 0;
}
exit($failed ? 1 : 0);
