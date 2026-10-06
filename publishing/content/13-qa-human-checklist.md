# Q&A eligibility: do not manufacture a question

Checked 2026-10-05. No matching actual question was identified and no answer
was posted. This file is a **factual checklist**, not an AI-generated answer
template to paste into English Stack Overflow.

## Stack Overflow

Status: NOT_ELIGIBLE for generated/AI-edited answers; NO_MATCHING_QUESTION.
[Official AI policy](https://stackoverflow.com/help/gen-ai-policy) prohibits
using generated drafts/text as answers. A human must write independently, not
paraphrase an agent answer to conceal origin. No artificial self-answered
advertising question, link-only response or irrelevant SDK mention.

If a genuine question is later found, a human can independently verify:

- Actual question URL, tags, accepted behavior and a reproducible minimal case.
- Header `Retry-After` may use seconds or HTTP-date; server-specific JSON hints
  are not universal HTTP behavior. Test dates with an injected clock.
- Do not replay a non-idempotent payment after a timeout without evidence. This
  particular backend has no purchase-status endpoint/idempotency guarantee.
- Native Node abort does not establish whether remote side effects completed.
- Binary floats do not preserve arbitrary decimal balances; show a minimal
  decimal/string solution without requiring the SDK to understand the answer.
- Explain the solution in the answer itself. Disclose genuine project affiliation
  only if a relevant source link is necessary; do not force a product link.

Relevant verifiable implementation references (research, not pasted answer):
[Python tests](https://github.com/usnuz/fragment-donor-sdk/blob/main/python/tests/test_client.py),
[Node tests](https://github.com/usnuz/fragment-donor-sdk/blob/main/typescript/test/client.test.mjs).
No successful purchase or browser support should be inferred.

## ru Stack Overflow

Status: NOT_RUN — NO_MATCHING_QUESTION. URL: https://ru.stackoverflow.com/.
[RU policy](https://ru.stackoverflow.com/help/gen-ai-policy) differs from English:
it permits generated material with explicit tool attribution and references.
This does not make a generic promotional answer appropriate. No question or
answer is invented in this pack.

Before any future answer: locate an actual matching question, read its context,
run a minimal reproducible example, provide a complete Russian explanation,
cite tool/source as required, disclose affiliation and check anti-spam rules.
Do not invent an accepted answer, author review, question URL or successful test.
Sensitive snippets use synthetic data. Purchase requests transmit wallet mnemonic and Fragment session/cookie data to the API operator;
mention that boundary if the proposed solution involves its wallet endpoints.
