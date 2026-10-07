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

- Four public API operations with typed requests/responses and preserved fields.
- Decimal strings, bounded read-only retries, flood wait/date hints, no purchase retries.
- Native cURL with disabled redirects, redacted diagnostics and deterministic tests.
- Explicit unknown-outcome errors for unconfirmed HTTP400 purchases, safe transaction
  details and uncertainty flags for transport/malformed/5xx failures; never retry.
- PSR-12 format gate, exact package-content/known-token scan and four-operation
  installed archive smoke with uncertainty/redaction regressions.
