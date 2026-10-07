# Changelog

## 0.1.3

- Replaced obsolete pre-publication wording with the exact published install command.
- No runtime API behavior changed.

## 0.1.2

- Removed obsolete public header names and wallet-funding recommendations from
  package documentation while preserving neutral credential-transmission facts.
- Refreshed package metadata and release artifacts for the corrected public text.

## 0.1.1

- Clarified that purchase requests transmit wallet mnemonic and Fragment
  session/cookie data to the API operator, with server-side safety guidance.
- Refreshed package metadata, install examples, and release artifacts for the
  corrected documentation.

## 0.1.0

- Initial four-method server-side API client with typed response structs.
- Preserves exact decimal balances and unknown fields; errors redact credentials.
- Bounded optional read retry; purchase retries and redirects disabled.
- Safe structured error details and finite timeout configuration validation.
- PurchaseOutcomeUnknownError and uncertainty flag preserve ambiguous purchases.
- Syntax/whitespace gates and allowlisted installed-gem consumer verification.
