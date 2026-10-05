# Changelog

## 0.1.0

- Async four-endpoint client with typed requests/responses and cancellation tokens.
- Decimal strings, future fields, typed redacted errors and HTTP-date flood hints.
- Disabled redirects, no purchase retries and deterministic fixture tests.
- Explicit unconfirmed HTTP400 purchase errors, safe transaction details and an
  unknown-outcome flag for transport/malformed/5xx failures; never retry.
- Native whitespace format gates, exact nupkg-content/known-token scan and
  four-operation installed-package uncertainty/redaction smoke.
- Exact compatibility for NuGet's deterministic metadata member, with ten
  package-checker regressions retaining the eight-member fail-closed gate.
