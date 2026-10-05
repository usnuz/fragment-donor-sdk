<?php

declare(strict_types=1);

return (new PhpCsFixer\Config())
    ->setRules(['@PSR12' => true])
    ->setRiskyAllowed(false)
    ->setUsingCache(false)
    ->setFinder(PhpCsFixer\Finder::create()->in(__DIR__)->ignoreDotFiles(false)->exclude(['vendor', 'dist'])->name('*.php'));
