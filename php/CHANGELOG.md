# Changelog

## 0.1.0

- Four public API operations with typed requests/responses and preserved fields.
- Decimal strings, bounded read-only retries, flood wait/date hints, no purchase retries.
- Native cURL with disabled redirects, redacted diagnostics and deterministic tests.
- Explicit unknown-outcome errors for unconfirmed HTTP400 purchases, safe transaction
  details and uncertainty flags for transport/malformed/5xx failures; never retry.
- PSR-12 format gate, exact package-content/known-token scan and four-operation
  installed archive smoke with uncertainty/redaction regressions.
