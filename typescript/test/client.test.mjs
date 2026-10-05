import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { inspect } from "node:util";
import test from "node:test";
import {
  ApiError,
  FloodWaitError,
  FragmentDonorClient,
  MalformedResponseError,
  ServiceUnavailableError,
  TransportError,
  ValidationError,
  WalletCredentials,
} from "../dist/index.js";

const fixture = JSON.parse(
  readFileSync(
    new URL("../../contract/fixtures.json", import.meta.url),
    "utf8",
  ),
);
function credentials(overrides = {}) {
  return new WalletCredentials({
    mnemonic: fixture.credentials.mnemonic,
    cookie: fixture.credentials.cookie,
    providerKey: fixture.credentials.provider_key,
    walletVersion: "v5r1",
    walletAddress: "SYNTHETIC_WALLET_ADDRESS",
    proxy: "http://SYNTHETIC_PROXY",
    userAgent: "SYNTHETIC_AGENT",
    ...overrides,
  });
}
function response(
  name = "user_info",
  status = 200,
  headers = {},
  data = fixture.responses[name],
) {
  return new Response(JSON.stringify(data), { status, headers });
}
function mock(...responses) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, init });
    const item = responses.shift();
    if (item instanceof Error) throw item;
    return item;
  };
  return { fetch, calls };
}

test("username GET preserves future fields and requires no auth", async () => {
  const transport = mock(response());
  const result = await new FragmentDonorClient({
    fetch: transport.fetch,
    credentials: credentials(),
  }).getUserInfo("@durov");
  const call = transport.calls[0];
  assert.equal(call.init.method, "GET");
  assert.equal(
    new URL(call.url).pathname,
    fixture.operations.get_user_info.path,
  );
  assert.equal(new URL(call.url).searchParams.get("username"), "@durov");
  for (const key of [
    "Authorization",
    "X-Api-Key",
    "Api-Key",
    "Mnemonic",
    "Cookie",
  ])
    assert.equal(call.init.headers[key], undefined);
  assert.deepEqual(result.future_field, { kept: true });
});
test("stars sends form-urlencoded and exact wallet headers", async () => {
  const transport = mock(response("purchase"));
  const result = await new FragmentDonorClient({
    fetch: transport.fetch,
    credentials: credentials(),
  }).buyStars("@durov", 50, { paymentMethod: "ton" });
  const call = transport.calls[0];
  assert.equal(call.init.method, "POST");
  assert.equal(new URL(call.url).pathname, fixture.operations.buy_stars.path);
  assert.deepEqual(Object.fromEntries(new URLSearchParams(call.init.body)), {
    username: "@durov",
    amount: "50",
    payment_method: "ton",
  });
  assert.equal(
    call.init.headers["Content-Type"],
    "application/x-www-form-urlencoded",
  );
  assert.equal(call.init.headers.Mnemonic, fixture.credentials.mnemonic);
  assert.equal(call.init.headers.Cookie, fixture.credentials.cookie);
  assert.equal(call.init.headers["Api-Key"], fixture.credentials.provider_key);
  assert.equal(call.init.headers["Wallet-Version"], "v5r1");
  assert.equal(call.init.headers.Proxy, "http://SYNTHETIC_PROXY");
  assert.equal(call.init.headers["User-Agent"], "SYNTHETIC_AGENT");
  assert.equal(call.init.headers.Authorization, undefined);
  assert.equal(call.init.headers["X-Api-Key"], undefined);
  assert.equal(call.init.redirect, "manual");
  assert.equal(result.future_field, "preserve");
});
test("premium sends duration and default payment method", async () => {
  const transport = mock(response("purchase"));
  await new FragmentDonorClient({ fetch: transport.fetch }).buyPremium(
    "durov",
    12,
    { credentials: credentials() },
  );
  assert.equal(
    new URL(transport.calls[0].url).pathname,
    fixture.operations.buy_premium.path,
  );
  assert.deepEqual(
    Object.fromEntries(new URLSearchParams(transport.calls[0].init.body)),
    { username: "durov", duration: "12", payment_method: "usdt_ton" },
  );
});
test("balance excludes cookie and preserves large decimal strings", async () => {
  const transport = mock(response("wallet_balance"));
  const result = await new FragmentDonorClient({
    fetch: transport.fetch,
    credentials: credentials({ cookie: undefined }),
  }).walletBalance();
  assert.equal(transport.calls[0].init.method, "GET");
  assert.equal(
    new URL(transport.calls[0].url).pathname,
    fixture.operations.wallet_balance.path,
  );
  assert.equal(transport.calls[0].init.headers.Cookie, undefined);
  assert.equal(transport.calls[0].init.headers.Proxy, undefined);
  assert.equal(result.usdt_ton, "9007199254740993.01");
  assert.equal(result.ton, "2.500000001");
  assert.equal(result.address, "SYNTHETIC_WALLET_ADDRESS");
  assert.equal(result.future_field, "preserve");
});
test("invalid arguments do not send HTTP", async () => {
  const transport = mock();
  const client = new FragmentDonorClient({
    fetch: transport.fetch,
    credentials: credentials(),
  });
  for (const action of [
    () => client.getUserInfo("bad"),
    () => client.buyStars("durov", 49),
    () => client.buyStars("durov", 1_000_001),
    () => client.buyStars("durov", 50.1),
    () => client.buyPremium("durov", 4),
    () => client.buyStars("durov", 50, { paymentMethod: "btc" }),
    () =>
      client.buyStars("durov", 50, {
        credentials: credentials({ cookie: undefined }),
      }),
  ]) {
    await assert.rejects(action, ValidationError);
  }
  assert.equal(transport.calls.length, 0);
});
test("configuration and headers reject invalid unsafe values", () => {
  for (const options of [
    { readonlyRetries: 3 },
    { timeoutMs: 0 },
    { timeoutMs: Infinity },
    { maxWaitSeconds: 61 },
    { baseUrl: "http://remote.invalid" },
    { baseUrl: "https://SYNTHETIC_USER:SYNTHETIC_PASSWORD@example.invalid" },
  ]) {
    assert.throws(() => new FragmentDonorClient(options), ValidationError);
  }
  assert.throws(() => credentials({ mnemonic: "one word" }), ValidationError);
  assert.throws(
    () => credentials({ cookie: "test\r\nCookie: injected" }),
    ValidationError,
  );
});
test("validation and reason errors expose status and sanitized body", async () => {
  for (const [name, text] of [
    ["validation", "Invalid amount"],
    ["upstream_error", "Not a user"],
  ]) {
    await assert.rejects(
      new FragmentDonorClient({
        fetch: mock(response(name, 400)).fetch,
      }).getUserInfo("durov"),
      (error) =>
        error instanceof ValidationError &&
        error.status === 400 &&
        error.message === text,
    );
  }
});
test("429 takes longest header/JSON wait and exposes errorCode", async () => {
  await assert.rejects(
    new FragmentDonorClient({
      fetch: mock(response("flood_wait", 429, { "Retry-After": "30" })).fetch,
    }).getUserInfo("durov"),
    (error) =>
      error instanceof FloodWaitError &&
      error.retryAfter === 42 &&
      error.errorCode === "FLOOD_WAIT",
  );
});
test("Retry-After accepts HTTP-date", async () => {
  await assert.rejects(
    new FragmentDonorClient({
      clock: () => 40_000,
      fetch: mock(
        response(
          "flood_wait",
          429,
          { "Retry-After": "Thu, 01 Jan 1970 00:01:10 GMT" },
          { ok: false },
        ),
      ).fetch,
    }).getUserInfo("durov"),
    (error) => error instanceof FloodWaitError && error.retryAfter === 30,
  );
});
test("503 exposes retry hint", async () => {
  await assert.rejects(
    new FragmentDonorClient({
      fetch: mock(response("unavailable", 503)).fetch,
    }).getUserInfo("durov"),
    (error) =>
      error instanceof ServiceUnavailableError && error.retryAfter === 5,
  );
});
test("retry and waiting require explicit optin", async () => {
  for (const options of [{}, { readonlyRetries: 2 }]) {
    const transport = mock(response("flood_wait", 429), response());
    await assert.rejects(
      new FragmentDonorClient({
        fetch: transport.fetch,
        ...options,
      }).getUserInfo("durov"),
      FloodWaitError,
    );
    assert.equal(transport.calls.length, 1);
  }
});
test("read-only optin retries respect waits and bounded attempts", async () => {
  const transport = mock(
    response("flood_wait", 429),
    response("unavailable", 503),
    response(),
  );
  const waits = [];
  const result = await new FragmentDonorClient({
    fetch: transport.fetch,
    readonlyRetries: 2,
    autoWait: true,
    sleep: async (seconds) => {
      waits.push(seconds);
    },
  }).getUserInfo("durov");
  assert.equal(result.ok, true);
  assert.equal(transport.calls.length, 3);
  assert.deepEqual(waits, [42, 5]);
});
test("wait above maximum is not shortened into early retry", async () => {
  const transport = mock(response("flood_wait", 429));
  await assert.rejects(
    new FragmentDonorClient({
      fetch: transport.fetch,
      readonlyRetries: 2,
      autoWait: true,
      maxWaitSeconds: 10,
    }).getUserInfo("durov"),
    FloodWaitError,
  );
  assert.equal(transport.calls.length, 1);
});
test("network retries stop at configured maximum", async () => {
  const transport = mock(
    new Error("network"),
    new Error("network"),
    new Error("network"),
  );
  const waits = [];
  await assert.rejects(
    new FragmentDonorClient({
      fetch: transport.fetch,
      readonlyRetries: 2,
      autoWait: true,
      sleep: async (seconds) => {
        waits.push(seconds);
      },
    }).getUserInfo("durov"),
    TransportError,
  );
  assert.equal(transport.calls.length, 3);
  assert.deepEqual(waits, [1, 2]);
});
test("purchases NEVER duplicate on timeout, reset, 429, 503, 500, malformed", async () => {
  const cases = [
    () => new Error("timeout"),
    () => new Error("reset"),
    () => response("flood_wait", 429),
    () => response("unavailable", 503),
    () => response("validation", 500),
    () => new Response("invalid-json"),
  ];
  for (const method of ["buyStars", "buyPremium"])
    for (const item of cases) {
      const transport = mock(item(), response("purchase"));
      const client = new FragmentDonorClient({
        fetch: transport.fetch,
        credentials: credentials(),
        readonlyRetries: 2,
        autoWait: true,
        sleep: async () => assert.fail("purchase waited"),
      });
      await assert.rejects(
        client[method]("durov", method === "buyStars" ? 50 : 3),
        ApiError,
      );
      assert.equal(transport.calls.length, 1);
    }
});
test("malformed JSON/schema and numeric balance are rejected", async () => {
  for (const text of [
    "oops",
    "[]",
    '{"ok":true}',
    '{"ok":"true"}',
    "x".repeat(1_048_577),
  ]) {
    await assert.rejects(
      new FragmentDonorClient({
        fetch: mock(new Response(text)).fetch,
      }).getUserInfo("durov"),
      MalformedResponseError,
    );
  }
  await assert.rejects(
    new FragmentDonorClient({
      credentials: credentials(),
      fetch: mock(
        response(
          "wallet_balance",
          200,
          {},
          {
            ok: true,
            address: "x",
            ton: 0.1,
            usdt_ton: "1",
          },
        ),
      ).fetch,
    }).walletBalance(),
    MalformedResponseError,
  );
});
test("credential/client inspect/JSON and echoed errors redact secrets", async () => {
  const creds = credentials();
  const transport = mock(
    response(
      "validation",
      400,
      {},
      {
        ok: false,
        error: "Rejected " + fixture.credentials.mnemonic,
        cookie: fixture.credentials.cookie,
        nested: {
          "Api-Key": fixture.credentials.provider_key,
          echo: fixture.credentials.cookie,
        },
      },
    ),
  );
  const client = new FragmentDonorClient({
    credentials: creds,
    fetch: transport.fetch,
  });
  let caught;
  try {
    await client.buyStars("durov", 50);
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof ApiError);
  for (const output of [
    inspect(creds),
    JSON.stringify(creds),
    inspect(client),
    JSON.stringify(client),
    caught.message,
    caught.stack,
    inspect(caught),
    JSON.stringify(caught.body),
  ]) {
    for (const secret of Object.values(fixture.credentials))
      assert.equal(output.includes(secret), false);
  }
  assert.equal(caught.body.cookie, "[REDACTED]");
});
test("network error never carries secret cause", async () => {
  const secret = fixture.credentials.mnemonic;
  await assert.rejects(
    new FragmentDonorClient({
      credentials: credentials(),
      fetch: mock(new Error(secret)).fetch,
    }).buyStars("durov", 50),
    (error) => {
      assert.equal(error.message.includes(secret), false);
      assert.equal(error.cause, undefined);
      assert.equal(error.purchaseOutcomeUnknown, true);
      return error instanceof TransportError;
    },
  );
});
test("partial cookie/proxy tokens and normalized mnemonic redact in public responses/errors", async () => {
  const normalized = fixture.credentials.mnemonic;
  const creds = credentials({
    mnemonic: "  " + normalized.split(" ").join("  ") + "  ",
    cookie:
      "stel_ssid=SYNTHETIC_SESSION_TOKEN; stel_token=SYNTHETIC%40COOKIE_TOKEN",
    proxy:
      "http://SYNTHETIC_PROXY_USER:SYNTHETIC%40PROXY_PASSWORD@proxy.invalid:8080",
  });
  const partials = [
    "SYNTHETIC_SESSION_TOKEN",
    "SYNTHETIC%40COOKIE_TOKEN",
    "SYNTHETIC@COOKIE_TOKEN",
    "SYNTHETIC_PROXY_USER",
    "SYNTHETIC%40PROXY_PASSWORD",
    "SYNTHETIC@PROXY_PASSWORD",
    normalized,
  ];
  for (const status of [200, 400]) {
    const client = new FragmentDonorClient({
      credentials: creds,
      fetch: mock(
        response(
          "user_info",
          status,
          {},
          {
            ok: status === 200,
            username: "durov",
            is_premium: false,
            future_normal: "keep",
            echoes: partials,
            error: partials.join(" | "),
          },
        ),
      ).fetch,
    });
    let displays;
    if (status === 200) {
      const result = await client.getUserInfo("durov");
      assert.equal(result.future_normal, "keep");
      assert.deepEqual(
        result.echoes,
        partials.map(() => "[REDACTED]"),
      );
      displays = [inspect(result), JSON.stringify(result)];
    } else {
      let failure;
      try {
        await client.getUserInfo("durov");
      } catch (error) {
        failure = error;
      }
      assert.ok(failure instanceof ApiError);
      displays = [
        failure.message,
        failure.stack,
        inspect(failure),
        JSON.stringify(failure.body),
      ];
    }
    for (const partial of partials)
      for (const display of displays)
        assert.equal(display.includes(partial), false);
  }
});
test("timeout signal aborts an injected abort-aware transport without a duplicate", async () => {
  let count = 0;
  const fetch = async (_url, init) => {
    count++;
    return new Promise((_resolve, reject) =>
      init.signal.addEventListener(
        "abort",
        () => reject(new Error("timed out")),
        { once: true },
      ),
    );
  };
  await assert.rejects(
    new FragmentDonorClient({
      timeoutMs: 10,
      credentials: credentials(),
      fetch,
    }).buyStars("durov", 50),
    TransportError,
  );
  assert.equal(count, 1);
});
test("redirect status is rejected; location is never followed", async () => {
  const transport = mock(
    new Response("", {
      status: 302,
      headers: { Location: "https://untrusted.invalid" },
    }),
  );
  await assert.rejects(
    new FragmentDonorClient({
      credentials: credentials(),
      fetch: transport.fetch,
    }).walletBalance(),
    ApiError,
  );
  assert.equal(transport.calls.length, 1);
  assert.equal(transport.calls[0].init.redirect, "manual");
});
