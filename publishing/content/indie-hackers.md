# Indie Hackers — conditional build-in-public material

Status: **NOT_RUN — official current posting rules not retrieved**. This draft
is not eligible for posting until the actual signed-in rules/editor/pinned
guidance are checked. `/guidelines` retrieval failed; comments written by users
and r/IndieHackers rules are not platform policy. Eligible publication is
authorized, but eligibility/access/editorial gates remain unverified here.
AI-generated draft; human editorial review pending.

Conditional title: **Shipping seven SDKs without teaching a payment retry bug**.
Audience: indie developers; format: engineering lessons, not traction advertisement.

## Conditional copy

Disclosure: AI generated this draft for Fragment Donor; human review is pending.
Independent project,
not official Telegram/Fragment/TON software. There are no customers, revenue,
download, uptime or actual payment figures claimed here.

The project is seven server SDKs for one small four-operation contract. The hard
part wasn't adding seven install commands; it was making failure behavior agree.
A spending POST cannot be wrapped in the same retries as a read. A timeout may
follow a successful payment, and this backend has no idempotency guarantee.
HTTP 400 `unconfirmed:true` is also uncertain, not ordinary validation rejection;
retain the safe transaction reference and reconcile rather than retry.

The common tests use synthetic fixtures: form fields, exact decimal strings,
429 hints, malformed responses, credentials echoed in errors and one outbound
purchase attempt after timeout. Native tests/build and installed artifacts are
reported separately per language. Source visibility is not registry publication.

Documentation is statically rendered in English, Russian and Uzbek. Each topic
has same-topic alternates and a self-canonical; publishing a site doesn't
guarantee search indexing or rankings. Crosspost canonicals should point to the
actual original article, not all converge on the docs homepage.

The trust limitation is part of the product, not a footnote: backend stores
submitted credentials. No service account/key is required, but wallet operations
need a mnemonic, and purchases also need a session cookie. SDK redaction doesn't
make this non-custodial. The evaluation
path is mocked source tests, not asking visitors to fund a wallet or enter a seed.

Source: https://github.com/usnuz/fragment-donor-sdk.
Docs: https://usnuz.github.io/fragment-donor-sdk/en/.
Credential boundary: https://usnuz.github.io/fragment-donor-sdk/en/guides/credentials/.
Useful discussion topics include consistent failure UX and multilingual technical
docs, not promotional upvotes or private outreach.

Only use first-person affiliation if true for the posting account. Read current
official rules, account gates and paid options before any posting; no cost or
DM authorization is inferred. If the platform disallows the draft, don't force it.
