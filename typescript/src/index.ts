/** Independent Fragment Donor API client. Node.js 20+ only; no service auth. */

export type WalletVersion = "auto" | "v5r1" | "v4r2" | "v3r2";
export type PaymentMethod = "usdt_ton" | "ton";
export type PremiumDuration = 3 | 6 | 12;
export interface ApiResponse {
  ok: true;
  [key: string]: unknown;
}
export interface UserInfoResponse extends ApiResponse {
  username: string;
  is_premium: boolean;
}
export interface PurchaseResponse extends ApiResponse {
  data?: unknown;
}
export interface WalletBalanceResponse extends ApiResponse {
  address: string;
  ton: string;
  usdt_ton: string;
}
export interface WalletCredentialsOptions {
  mnemonic: string;
  cookie?: string;
  walletVersion?: WalletVersion;
  walletAddress?: string;
  providerKey?: string;
  proxy?: string;
  userAgent?: string;
}
export interface PurchaseOptions {
  credentials?: WalletCredentials;
  paymentMethod?: PaymentMethod;
}
export interface ErrorOptions {
  status?: number;
  errorCode?: string;
  retryAfter?: number;
  body?: Readonly<Record<string, unknown>>;
  purchaseOutcomeUnknown?: boolean;
}
export type HttpTransport = (
  url: string,
  init: RequestInit,
  options?: Readonly<{ connectTimeoutMs?: number }>,
) => Promise<Response>;
export interface ClientOptions {
  baseUrl?: string;
  credentials?: WalletCredentials;
  timeoutMs?: number;
  /** Requires an injected transport that enforces this setting; not native fetch. */
  connectTimeoutMs?: number;
  readonlyRetries?: number;
  autoWait?: boolean;
  maxWaitSeconds?: number;
  fetch?: HttpTransport;
  sleep?: (seconds: number) => Promise<void>;
  clock?: () => number;
}

const inspect = Symbol.for("nodejs.util.inspect.custom");
const sensitive =
  /mnemonic|cookie|password|secret|token|api.?key|proxy|authorization/i;
const maxResponseSize = 1_048_576;

function sanitize(value: unknown, secrets: readonly string[] = []): unknown {
  if (typeof value === "string") {
    for (const secret of [...secrets]
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)) {
      value = (value as string).split(secret).join("[REDACTED]");
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => sanitize(item, secrets));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sensitive.test(key) ? "[REDACTED]" : sanitize(item, secrets),
      ]),
    );
  }
  return value;
}

export class ApiError extends Error {
  readonly status?: number;
  readonly errorCode?: string;
  readonly retryAfter?: number;
  readonly body: Readonly<Record<string, unknown>>;
  readonly purchaseOutcomeUnknown: boolean;
  constructor(message: string, options: ErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.status = options.status;
    this.errorCode = options.errorCode;
    this.retryAfter = options.retryAfter;
    this.body = Object.freeze({ ...options.body });
    this.purchaseOutcomeUnknown = options.purchaseOutcomeUnknown ?? false;
  }
  [inspect](): string {
    return `${this.name}(status=${this.status}, retryAfter=${this.retryAfter})`;
  }
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      status: this.status,
      retryAfter: this.retryAfter,
      purchaseOutcomeUnknown: this.purchaseOutcomeUnknown,
    };
  }
}
export class ValidationError extends ApiError {}
export class FloodWaitError extends ApiError {}
export class ServiceUnavailableError extends ApiError {}
export class TransportError extends ApiError {}
export class PurchaseOutcomeUnknownError extends ApiError {}
export class MalformedResponseError extends ApiError {}

export class WalletCredentials {
  #values: Readonly<WalletCredentialsOptions>;
  constructor(options: WalletCredentialsOptions) {
    for (const value of Object.values(options)) {
      if (
        value !== undefined &&
        (typeof value !== "string" || /[\r\n]/.test(value))
      ) {
        throw new ValidationError(
          "Credential headers must be strings without line breaks",
        );
      }
    }
    if (
      typeof options.mnemonic !== "string" ||
      ![12, 18, 24].includes(options.mnemonic.trim().split(/\s+/).length)
    ) {
      throw new ValidationError("Mnemonic must contain 12, 18, or 24 words");
    }
    const version = options.walletVersion ?? "auto";
    if (!["auto", "v5r1", "v4r2", "v3r2"].includes(version)) {
      throw new ValidationError("Unsupported wallet version");
    }
    this.#values = Object.freeze({ ...options, walletVersion: version });
  }
  toString(): string {
    return "WalletCredentials([REDACTED])";
  }
  toJSON(): string {
    return "[REDACTED]";
  }
  [inspect](): string {
    return this.toString();
  }
  /** Transport implementations must not log the returned headers. */
  headers(purchase = false): Record<string, string> {
    const values = this.#values;
    if (purchase && !values.cookie?.trim())
      throw new ValidationError("Fragment cookie is required for purchases");
    const headers: Record<string, string> = {
      Mnemonic: values.mnemonic.trim().split(/\s+/).join(" "),
      "Wallet-Version": values.walletVersion ?? "auto",
    };
    if (values.walletAddress) headers["Wallet-Address"] = values.walletAddress;
    if (values.providerKey) headers["Api-Key"] = values.providerKey;
    if (purchase) {
      if (values.cookie) headers.Cookie = values.cookie;
      if (values.proxy) headers.Proxy = values.proxy;
      if (values.userAgent) headers["User-Agent"] = values.userAgent;
    }
    return headers;
  }
  /** Sanitizes any server echo before it becomes part of an SDK result/error. */
  redact(value: unknown): unknown {
    const strings = [
      this.#values.mnemonic,
      this.#values.cookie,
      this.#values.providerKey,
      this.#values.proxy,
    ].filter((v): v is string => typeof v === "string");
    strings.push(this.#values.mnemonic.trim().split(/\s+/).join(" "));
    const decoded = (value: string): string => {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    };
    if (this.#values.cookie) {
      for (const item of this.#values.cookie.split(";")) {
        const split = item.indexOf("=");
        if (split >= 0) {
          const token = item
            .slice(split + 1)
            .trim()
            .replace(/^"|"$/g, "");
          if (token) strings.push(token, decoded(token));
        }
      }
    }
    if (this.#values.proxy) {
      try {
        const proxy = new URL(
          this.#values.proxy.includes("://")
            ? this.#values.proxy
            : "http://" + this.#values.proxy,
        );
        for (const value of [proxy.username, proxy.password]) {
          if (value) strings.push(value, decoded(value));
        }
      } catch {
        /* Invalid proxy text is still redacted in full. */
      }
    }
    return sanitize(value, strings);
  }
}

function usernameValid(username: string): void {
  if (
    typeof username !== "string" ||
    !/^@?[A-Za-z][A-Za-z0-9_]{3,31}$/.test(username)
  ) {
    throw new ValidationError("Invalid username");
  }
}

function retryHint(
  response: Response,
  body: Record<string, unknown>,
  clock: () => number,
): number | undefined {
  const hints: number[] = [];
  const header = response.headers.get("Retry-After");
  if (header !== null && header.trim()) {
    const numeric = Number(header);
    if (Number.isFinite(numeric)) hints.push(numeric);
    else {
      const date = Date.parse(header);
      if (Number.isFinite(date))
        hints.push(Math.max(0, (date - clock()) / 1000));
    }
  }
  for (const key of ["retry_after", "flood_wait"]) {
    const value = body[key];
    if (
      (typeof value === "number" || typeof value === "string") &&
      String(value).trim()
    ) {
      hints.push(Number(value));
    }
  }
  const valid = hints.filter((value) => Number.isFinite(value) && value >= 0);
  return valid.length ? Math.max(...valid) : undefined;
}

export class FragmentDonorClient {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly connectTimeoutMs?: number;
  readonly readonlyRetries: number;
  readonly autoWait: boolean;
  readonly maxWaitSeconds: number;
  #credentials?: WalletCredentials;
  #fetch: HttpTransport;
  #sleep: (seconds: number) => Promise<void>;
  #clock: () => number;

  constructor(options: ClientOptions = {}) {
    // Do not silently encourage moving a seed/cookie into a browser bundle.
    const runtime = globalThis as unknown as {
      process?: { versions?: { node?: string } };
    };
    if (!runtime.process?.versions?.node)
      throw new ValidationError(
        "Fragment Donor SDK requires server-side Node.js 20+",
      );
    let url: URL;
    try {
      url = new URL(options.baseUrl ?? "https://fragment.donor.uz");
    } catch {
      throw new ValidationError("Invalid base URL");
    }
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      (url.protocol !== "https:" && !(url.protocol === "http:" && local)) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new ValidationError(
        "Base URL must be HTTPS, without credentials, query, or fragment",
      );
    }
    this.baseUrl = url.toString().replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.connectTimeoutMs = options.connectTimeoutMs;
    this.readonlyRetries = options.readonlyRetries ?? 0;
    this.autoWait = options.autoWait ?? false;
    this.maxWaitSeconds = options.maxWaitSeconds ?? 60;
    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0)
      throw new ValidationError("timeoutMs must be positive and finite");
    if (this.connectTimeoutMs !== undefined) {
      if (!Number.isFinite(this.connectTimeoutMs) || this.connectTimeoutMs <= 0)
        throw new ValidationError(
          "connectTimeoutMs must be positive and finite",
        );
      if (!options.fetch)
        throw new ValidationError(
          "connectTimeoutMs requires an injected transport that enforces it",
        );
    }
    if (
      !Number.isInteger(this.readonlyRetries) ||
      this.readonlyRetries < 0 ||
      this.readonlyRetries > 2
    ) {
      throw new ValidationError(
        "readonlyRetries must be an integer between 0 and 2",
      );
    }
    if (
      !Number.isFinite(this.maxWaitSeconds) ||
      this.maxWaitSeconds < 0 ||
      this.maxWaitSeconds > 60
    ) {
      throw new ValidationError("maxWaitSeconds must be between 0 and 60");
    }
    this.#credentials = options.credentials;
    this.#fetch =
      options.fetch ?? ((input, init) => globalThis.fetch(input, init));
    this.#sleep =
      options.sleep ??
      ((seconds) =>
        new Promise((resolve) => setTimeout(resolve, seconds * 1000)));
    this.#clock = options.clock ?? Date.now;
  }
  [inspect](): string {
    return "FragmentDonorClient(credentials=[REDACTED])";
  }
  toJSON(): string {
    return "FragmentDonorClient([REDACTED])";
  }

  async getUserInfo(username: string): Promise<UserInfoResponse> {
    usernameValid(username);
    return this.#request<UserInfoResponse>(
      "/get-user-info/?" + new URLSearchParams({ username }),
      "GET",
      "user",
    );
  }
  async buyStars(
    username: string,
    amount: number,
    options: PurchaseOptions = {},
  ): Promise<PurchaseResponse> {
    usernameValid(username);
    if (!Number.isInteger(amount) || amount < 50 || amount > 1_000_000) {
      throw new ValidationError(
        "amount must be an integer between 50 and 1000000",
      );
    }
    return this.#purchase(
      "/buy-stars/",
      { username, amount: String(amount) },
      options,
    );
  }
  async buyPremium(
    username: string,
    duration: PremiumDuration,
    options: PurchaseOptions = {},
  ): Promise<PurchaseResponse> {
    usernameValid(username);
    if (!Number.isInteger(duration) || ![3, 6, 12].includes(duration)) {
      throw new ValidationError("duration must be 3, 6, or 12 months");
    }
    return this.#purchase(
      "/buy-premium/",
      { username, duration: String(duration) },
      options,
    );
  }
  async walletBalance(
    options: { credentials?: WalletCredentials } = {},
  ): Promise<WalletBalanceResponse> {
    return this.#request<WalletBalanceResponse>(
      "/wallet-balance/",
      "GET",
      "wallet",
      this.#getCredentials(options.credentials),
    );
  }
  #getCredentials(override?: WalletCredentials): WalletCredentials {
    const credentials = override ?? this.#credentials;
    if (!(credentials instanceof WalletCredentials))
      throw new ValidationError(
        "WalletCredentials are required for this operation",
      );
    return credentials;
  }
  async #purchase(
    path: string,
    form: Record<string, string>,
    options: PurchaseOptions,
  ): Promise<PurchaseResponse> {
    const paymentMethod = options.paymentMethod ?? "usdt_ton";
    if (!["usdt_ton", "ton"].includes(paymentMethod))
      throw new ValidationError("paymentMethod must be usdt_ton or ton");
    return this.#request<PurchaseResponse>(
      path,
      "POST",
      "purchase",
      this.#getCredentials(options.credentials),
      {
        ...form,
        payment_method: paymentMethod,
      },
    );
  }
  async #request<T extends ApiResponse>(
    path: string,
    method: "GET" | "POST",
    kind: "user" | "wallet" | "purchase",
    credentials?: WalletCredentials,
    form?: Record<string, string>,
  ): Promise<T> {
    const purchase = kind === "purchase";
    const headers: Record<string, string> = {
      Accept: "application/json",
      "User-Agent": "fragment-donor-sdk-node/0.1.3",
      ...credentials?.headers(purchase),
    };
    const body = form ? new URLSearchParams(form).toString() : undefined;
    if (form) headers["Content-Type"] = "application/x-www-form-urlencoded";
    const retries = purchase ? 0 : this.readonlyRetries;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      let failure: ApiError;
      try {
        const response = await this.#fetch(
          this.baseUrl + path,
          {
            method,
            headers,
            body,
            signal: controller.signal,
            redirect: "manual",
          },
          { connectTimeoutMs: this.connectTimeoutMs },
        );
        const text = await response.text();
        const result = this.#decode<T>(
          response,
          text,
          kind,
          credentials ?? this.#credentials,
        );
        if (!(result instanceof ApiError)) return result;
        failure = result;
      } catch {
        // Native fetch errors can contain request headers and proxy passwords.
        failure = new TransportError(
          "Request failed: network error or timeout",
          { purchaseOutcomeUnknown: purchase },
        );
      } finally {
        clearTimeout(timer);
      }
      const transient =
        failure instanceof TransportError ||
        failure instanceof FloodWaitError ||
        failure instanceof ServiceUnavailableError ||
        (failure.status !== undefined && failure.status >= 500);
      const wait = failure.retryAfter ?? Math.min(2 ** attempt, 4);
      if (
        attempt < retries &&
        transient &&
        this.autoWait &&
        wait <= this.maxWaitSeconds
      ) {
        await this.#sleep(wait);
        continue;
      }
      throw failure;
    }
    throw new Error("Unreachable");
  }
  #decode<T extends ApiResponse>(
    response: Response,
    text: string,
    kind: "user" | "wallet" | "purchase",
    credentials?: WalletCredentials,
  ): T | ApiError {
    let body: Record<string, unknown> = {};
    let malformed = false;
    try {
      if (text.length > maxResponseSize) throw new Error("oversized");
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error("not object");
      body = (
        credentials ? credentials.redact(parsed) : sanitize(parsed)
      ) as Record<string, unknown>;
    } catch {
      malformed = true;
    }
    const options: ErrorOptions = {
      status: response.status,
      retryAfter: retryHint(response, body, this.#clock),
      body,
      purchaseOutcomeUnknown:
        kind === "purchase" &&
        (body.unconfirmed === true ||
          malformed ||
          response.status >= 500 ||
          (response.status >= 300 && response.status < 400)),
    };
    if (typeof body.error_code === "string")
      options.errorCode = body.error_code;
    if (kind === "purchase" && body.unconfirmed === true)
      return new PurchaseOutcomeUnknownError(
        String(
          body.info ??
            body.error ??
            "Purchase outcome is unconfirmed; reconcile before another purchase",
        ),
        options,
      );
    if (response.status === 429)
      return new FloodWaitError(
        "Rate limit exceeded; inspect retryAfter",
        options,
      );
    if (response.status === 503)
      return new ServiceUnavailableError(
        "Service temporarily unavailable",
        options,
      );
    if (malformed)
      return new MalformedResponseError(
        "Response is not a valid JSON object",
        options,
      );
    if (!response.ok || body.ok === false) {
      const message = String(body.error ?? body.reason ?? "API request failed");
      return response.status === 400
        ? new ValidationError(message, options)
        : new ApiError(message, options);
    }
    if (body.ok !== true)
      return new MalformedResponseError(
        "Response is missing boolean ok",
        options,
      );
    if (
      kind === "user" &&
      (typeof body.username !== "string" ||
        typeof body.is_premium !== "boolean")
    ) {
      return new MalformedResponseError(
        "User response has invalid fields",
        options,
      );
    }
    if (
      kind === "wallet" &&
      ["address", "ton", "usdt_ton"].some(
        (key) => typeof body[key] !== "string",
      )
    ) {
      return new MalformedResponseError(
        "Wallet response must preserve decimal strings",
        options,
      );
    }
    return Object.freeze(body) as T;
  }
}
