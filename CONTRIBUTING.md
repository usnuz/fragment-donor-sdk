# Contributing

Do not send real payments during tests. Use contract/fixtures.json and injectable
transports. All seven SDKs must preserve unknown fields/decimal balance strings,
omit service-auth headers, disable redirects in owned transports, and never
automatically retry a purchase. Keep provider Api-Key distinct from service auth.
Do not add wallet mnemonics, session cookies, proxy passwords, provider keys,
production configuration, or backend Git history to this public repository.

Run language-specific checks documented in each SDK README, then:

```sh
node scripts/public-files.mjs
node contract/build.mjs
node docs/build.mjs
node docs/test.mjs
```

Translations must cover the same topic under en/ru/uz with reciprocal same-topic
language links. Source docs are docs/content.mjs; generated site/ is ignored.
Registry publication requires versioned tested artifacts and platform access.
