# Changelog

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
