# Fragment Donor SDK 0.1.0

Seven independent server-side clients: Python, Node.js/TypeScript, PHP, .NET,
Go, Rust and Ruby. Source and built release artifacts are separate from registry
publication; consult publication-status.json before using registry commands.

- Four backend-aligned form/query operations, no service login or service key.
- Optional Api-Key is TonConsole configuration, not service authentication.
- Exact decimal balance strings, retained unknown fields and redacted errors.
- Explicit unknown-payment outcome for unconfirmed transfers, including HTTP400.
- No automatic purchase retry; read-only waiting is opt-in and bounded.
- Native mocked tests, package-content/security gates and consumer smoke tests.
- Static English, Russian and Uzbek documentation and guarded Postman examples.

Docs: https://usnuz.github.io/fragment-donor-sdk/
Source: https://github.com/usnuz/fragment-donor-sdk
Go module: github.com/usnuz/fragment-donor-sdk/go (go/v0.1.0 tag).

This is not an official Telegram, Fragment or TON product. Purchase requests
transmit wallet mnemonic and Fragment session/cookie data to the API operator.
Use server-side secret storage and a dedicated, minimally funded wallet. No real
payment was used to test this release. Artifacts and
source are licensed MIT; dependency licenses remain applicable.
