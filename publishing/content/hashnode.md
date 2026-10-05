# Hashnode publication payload

Status: READY AI-generated draft; eligible publication authorized,
account/editorial review and actual publication NOT_RUN.
Title: **A server-only Telegram Stars SDK: transport and trust boundaries**.
Tags: `typescript`, `nodejs`, `api`, `security`.

## Copy

Disclosure: AI assisted this draft for Fragment Donor, an independent project,
not an official Telegram, Fragment or TON product. Author review is required
before publication. No real wallet transaction is demonstrated.

A typed Node.js API client can still be dangerous in the wrong runtime. Our
Node20+ package uses native fetch and exports TypeScript declarations, but
purchase code is intentionally server-only. Browser Cookie header restrictions
and mnemonic exposure make frontend/localStorage examples inappropriate.

Start with a username read that sends no wallet or service credentials:

```typescript
import { FragmentDonorClient } from "fragment-donor-sdk";

const client = new FragmentDonorClient({ timeoutMs: 30_000 });
const user = await client.getUserInfo("durov");
console.log(user.username, user.is_premium);
```

Check the repository's release state before using the npm install command. Source,
a built tarball and a published registry version are different milestones.

The direct API requires no service login, Authorization or X-Api-Key. Wallet
operations still need a mnemonic and purchases need the Fragment cookie; optional
providerKey maps to TonConsole Api-Key only. The backend stores submitted purchase
credentials, so server-only code is necessary but doesn't eliminate operator
retention. Use a dedicated minimally funded wallet and evaluate that access.

Our transport refuses redirects and uses abort for timeouts. Redirect refusal
prevents forwarding secret headers to a redirected host. Aborting a request does
not roll back remote side effects, which is why a spending POST never retries,
including 429/503/5xx. Read-only retries are explicit and bounded, with Retry-After
seconds/date and JSON hints; a wait above the maximum is not shortened. HTTP 400
with `unconfirmed:true` and a transaction hash also requires reconciliation,
not a classification of “validation rejected, safely retry.”

The most useful tests inject fetch and count dispatches. A synthetic timeout
after a purchase results in one request, not two. Additional cases preserve
decimal balance strings, retain future normal fields, mask partial cookie/proxy
echoes and require exactly one selected gift in the executable example. Custom
fetch implementations must not undo redirect/retry/logging protections.

Source/tests: https://github.com/usnuz/fragment-donor-sdk/tree/main/typescript.
Node docs: https://usnuz.github.io/fragment-donor-sdk/en/sdk/typescript/.
Credential guide: https://usnuz.github.io/fragment-donor-sdk/en/guides/credentials/.

## Author actions

[Hashnode terms](https://hashnode.com/terms) require reviewing/editing/approving
AI output and forbid spam/SEO manipulation. Use an authorized publication and
free subdomain; no domain purchase. This is an original scoped article. Only
literal republication uses its actual verified original canonical URL; do not
point all canonicals at docs home. Preview code rendering and disclosure first.
