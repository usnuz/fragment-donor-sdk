# Manual actions requiring owner access

No credential, token, password, wallet seed, or cookie should be sent in chat.
Complete account authentication/2FA in the normal platform UI or configure a
scoped GitHub publishing secret/trusted publisher yourself.

1. **Registry accounts:** authorize PyPI, npm, Packagist, NuGet, crates.io and
   RubyGems publisher accounts. Artifacts can be tested without publication.
   Configure first-publication ownership and required 2FA. Read the registry
   instructions linked from PUBLISHING_RUNBOOK.md. No account or token has been
   created without owner participation.
2. **Search verification:** sign in to Search Console/Bing, add the GitHub Pages
   URL-prefix property, obtain a verification method, and submit the actual live
   sitemap. No Google/Bing indexing guarantee is made.
3. **Mirrors/catalogs:** authenticate only the chosen GitLab, ReadTheDocs,
   SourceForge, Postman, Swagger Studio, TON App or RapidAPI account. Catalog
   acceptance and publication are distinct. Decline paid plans until explicitly
   authorized. Preserve a single primary canonical documentation site.
4. **Editorial/community channels:** inspect current platform/subreddit/group
   rules and AI policies before posting. Provide genuine product details and
   affiliation disclosure. Do not submit fabricated Stack Overflow questions.
   Human-only platforms need genuinely human-authored content, not AI text
   relabeled or lightly edited to evade a rule.
5. **Backend credential retention:** the existing API persists raw purchase
   credentials. A separate backend hardening task is needed before claiming
   zero retention. Publishing client SDKs does not change production behavior.

Exact per-channel state and evidence: publication-status.json and PLATFORM_MATRIX.md.
