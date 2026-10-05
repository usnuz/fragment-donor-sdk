// Package fragmentdonor provides server-side, no-service-auth Fragment Donor clients.
// Purchase requests are always sent at most once; redirects are never followed.
package fragmentdonor

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const Version = "0.1.0"
const DefaultBaseURL = "https://fragment.donor.uz"

// Credentials are purchase/wallet credentials, not service authentication.
// ProviderKey is an optional TonConsole key, never an X-Api-Key.
type Credentials struct {
	Mnemonic      string
	Cookie        string
	WalletVersion string
	WalletAddress string
	ProviderKey   string
	Proxy         string
	UserAgent     string
}

func (Credentials) String() string               { return "Credentials{[REDACTED]}" }
func (c Credentials) GoString() string           { return c.String() }
func (Credentials) MarshalJSON() ([]byte, error) { return []byte(`{"credentials":"[REDACTED]"}`), nil }

// Config controls timeouts and opt-in retries for read-only operations only.
// A custom Transport must not retry purchases or follow redirects itself.
type Config struct {
	BaseURL        string
	Credentials    Credentials
	Timeout        time.Duration
	ConnectTimeout time.Duration
	ReadRetries    int           // 0 by default, maximum 2.
	AutomaticWait  bool          // permits bounded waits on GET 429/503 only.
	MaxWait        time.Duration // maximum 60 seconds; longer server waits are not retried.
	Transport      http.RoundTripper
	Sleep          func(context.Context, time.Duration) error
	Now            func() time.Time
	AllowLocalHTTP bool // tests/development: loopback HTTP only.
}

func (Config) String() string               { return "Config{credentials and transport [REDACTED]}" }
func (c Config) GoString() string           { return c.String() }
func (Config) MarshalJSON() ([]byte, error) { return []byte(`{"config":"[REDACTED]"}`), nil }

type Client struct {
	base          *url.URL
	credentials   Credentials
	http          *http.Client
	readRetries   int
	automaticWait bool
	maxWait       time.Duration
	sleep         func(context.Context, time.Duration) error
	now           func() time.Time
}

func (*Client) String() string     { return "FragmentDonorClient{credentials [REDACTED]}" }
func (c *Client) GoString() string { return c.String() }

func NewClient(cfg Config) (*Client, error) {
	base := cfg.BaseURL
	if base == "" {
		base = DefaultBaseURL
	}
	u, err := url.Parse(base)
	if err != nil || u.Host == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return nil, localValidation("Invalid base URL")
	}
	loopback := u.Hostname() == "localhost" || (net.ParseIP(u.Hostname()) != nil && net.ParseIP(u.Hostname()).IsLoopback())
	if u.Scheme != "https" && !(cfg.AllowLocalHTTP && u.Scheme == "http" && loopback) {
		return nil, localValidation("HTTPS is required; local HTTP is for tests only")
	}
	if cfg.ReadRetries < 0 || cfg.ReadRetries > 2 {
		return nil, localValidation("ReadRetries must be between 0 and 2")
	}
	if cfg.Timeout == 0 {
		cfg.Timeout = 30 * time.Second
	}
	if cfg.ConnectTimeout == 0 {
		cfg.ConnectTimeout = 5 * time.Second
	}
	if cfg.MaxWait == 0 {
		cfg.MaxWait = 60 * time.Second
	}
	if cfg.Timeout <= 0 || cfg.ConnectTimeout <= 0 || cfg.MaxWait <= 0 || cfg.MaxWait > 60*time.Second {
		return nil, localValidation("Timeouts must be positive and MaxWait must not exceed 60 seconds")
	}
	if cfg.Transport == nil {
		transport := &http.Transport{
			ForceAttemptHTTP2:     true,
			MaxIdleConns:          100,
			IdleConnTimeout:       90 * time.Second,
			ExpectContinueTimeout: time.Second,
		}
		if defaultTransport, ok := http.DefaultTransport.(*http.Transport); ok {
			transport = defaultTransport.Clone()
		}
		transport.DialContext = (&net.Dialer{Timeout: cfg.ConnectTimeout, KeepAlive: 30 * time.Second}).DialContext
		transport.TLSHandshakeTimeout = cfg.ConnectTimeout
		cfg.Transport = transport
	}
	if cfg.Sleep == nil {
		cfg.Sleep = sleepContext
	}
	if cfg.Now == nil {
		cfg.Now = time.Now
	}
	c := &Client{base: u, credentials: cfg.Credentials, readRetries: cfg.ReadRetries, automaticWait: cfg.AutomaticWait, maxWait: cfg.MaxWait, sleep: cfg.Sleep, now: cfg.Now}
	c.http = &http.Client{Timeout: cfg.Timeout, Transport: cfg.Transport, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	return c, nil
}

func sleepContext(ctx context.Context, d time.Duration) error {
	timer := time.NewTimer(d)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-timer.C:
		return nil
	}
}

type ErrorKind string

const (
	ValidationError             ErrorKind = "validation"
	APIError                    ErrorKind = "api"
	RateLimitError              ErrorKind = "rate_limit"
	UnavailableError            ErrorKind = "unavailable"
	TimeoutError                ErrorKind = "timeout"
	NetworkError                ErrorKind = "network"
	MalformedResponseError      ErrorKind = "malformed_response"
	PurchaseOutcomeUnknownError ErrorKind = "purchase_outcome_unknown"
)

// Error intentionally has no raw response, headers, URL or underlying transport error.
type Error struct {
	Kind       ErrorKind
	StatusCode int
	Code       string
	Message    string
	RetryAfter time.Duration
	// OutcomeUnknown means a purchase may already have spent funds. Never replay it.
	// False is not an idempotency or rejection guarantee.
	OutcomeUnknown bool
	// Details retains every JSON error field, recursively redacting credentials.
	// tx_hash/unconfirmed/transient remain available for manual reconciliation.
	Details map[string]json.RawMessage
}

func (e *Error) Error() string {
	return fmt.Sprintf("Fragment Donor %s (%d): %s", e.Kind, e.StatusCode, e.Message)
}
func (e *Error) GoString() string           { return e.Error() }
func localValidation(message string) *Error { return &Error{Kind: ValidationError, Message: message} }

type UserInfo struct {
	OK        bool                       `json:"ok"`
	Username  string                     `json:"username"`
	IsPremium bool                       `json:"is_premium"`
	Extra     map[string]json.RawMessage `json:"-"`
}
type Purchase struct {
	OK    bool                       `json:"ok"`
	Data  json.RawMessage            `json:"data"`
	Extra map[string]json.RawMessage `json:"-"`
}
type WalletBalance struct {
	OK      bool                       `json:"ok"`
	Address string                     `json:"address"`
	TON     string                     `json:"ton"` // exact decimal string; never float64.
	USDTTON string                     `json:"usdt_ton"`
	Extra   map[string]json.RawMessage `json:"-"`
}

// Diagnostic representations intentionally omit response contents. Extra/Data
// remain explicitly accessible, including unknown server fields.
func (UserInfo) String() string          { return "UserInfo{response [REDACTED]}" }
func (r UserInfo) GoString() string      { return r.String() }
func (Purchase) String() string          { return "Purchase{response [REDACTED]}" }
func (r Purchase) GoString() string      { return r.String() }
func (WalletBalance) String() string     { return "WalletBalance{response [REDACTED]}" }
func (r WalletBalance) GoString() string { return r.String() }

var usernamePattern = regexp.MustCompile(`^@?[A-Za-z][A-Za-z0-9_]{3,31}$`)

func validateUsername(username string) error {
	if !usernamePattern.MatchString(username) {
		return localValidation("Invalid username")
	}
	return nil
}

func (c *Client) GetUserInfo(ctx context.Context, username string) (*UserInfo, error) {
	if err := validateUsername(username); err != nil {
		return nil, err
	}
	data, err := c.request(ctx, http.MethodGet, "/get-user-info/", url.Values{"username": {username}}, nil, false, false)
	if err != nil {
		return nil, err
	}
	var result UserInfo
	if err := decodeResponse(data, &result); err != nil {
		return nil, err
	}
	result.Extra = unknown(data, "ok", "username", "is_premium")
	return &result, nil
}

// BuyStars always makes at most one HTTP attempt, even for 429/503/timeouts.
func (c *Client) BuyStars(ctx context.Context, username string, amount int, paymentMethod string) (*Purchase, error) {
	if err := validateUsername(username); err != nil {
		return nil, err
	}
	if amount < 50 || amount > 1000000 {
		return nil, localValidation("Stars amount must be 50..1000000")
	}
	return c.buy(ctx, "/buy-stars/", username, "amount", amount, paymentMethod)
}

func (c *Client) BuyPremium(ctx context.Context, username string, duration int, paymentMethod string) (*Purchase, error) {
	if err := validateUsername(username); err != nil {
		return nil, err
	}
	if duration != 3 && duration != 6 && duration != 12 {
		return nil, localValidation("Premium duration must be 3, 6 or 12")
	}
	return c.buy(ctx, "/buy-premium/", username, "duration", duration, paymentMethod)
}

func (c *Client) buy(ctx context.Context, path, username, field string, quantity int, paymentMethod string) (*Purchase, error) {
	form := url.Values{"username": {username}, field: {strconv.Itoa(quantity)}}
	if paymentMethod != "" {
		if paymentMethod != "ton" && paymentMethod != "usdt_ton" {
			return nil, localValidation("payment_method must be ton or usdt_ton")
		}
		form.Set("payment_method", paymentMethod)
	}
	data, err := c.request(ctx, http.MethodPost, path, nil, form, true, true)
	if err != nil {
		return nil, err
	}
	var result Purchase
	if err := decodeResponse(data, &result); err != nil {
		var apiErr *Error
		if errors.As(err, &apiErr) {
			apiErr.OutcomeUnknown = true
			apiErr.Details = c.safeDetails(data)
		}
		return nil, err
	}
	result.Extra = unknown(data, "ok", "data")
	return &result, nil
}

// WalletBalance uses GET. The backend also accepts POST, but GET is preferred.
func (c *Client) WalletBalance(ctx context.Context) (*WalletBalance, error) {
	data, err := c.request(ctx, http.MethodGet, "/wallet-balance/", nil, nil, true, false)
	if err != nil {
		return nil, err
	}
	var result WalletBalance
	if err := decodeResponse(data, &result); err != nil {
		return nil, err
	}
	if result.Address == "" || result.TON == "" || result.USDTTON == "" {
		return nil, &Error{Kind: MalformedResponseError, Message: "Incomplete wallet response"}
	}
	result.Extra = unknown(data, "ok", "address", "ton", "usdt_ton")
	return &result, nil
}

func decodeResponse(data map[string]json.RawMessage, result any) error {
	raw, err := json.Marshal(data)
	if err == nil {
		err = json.Unmarshal(raw, result)
	}
	if err != nil {
		return &Error{Kind: MalformedResponseError, Message: "Unexpected response field type"}
	}
	return nil
}

func unknown(data map[string]json.RawMessage, known ...string) map[string]json.RawMessage {
	result := make(map[string]json.RawMessage, len(data))
	for k, v := range data {
		result[k] = v
	}
	for _, k := range known {
		delete(result, k)
	}
	return result
}

func (c *Client) credentialHeaders(wallet, purchase bool) (http.Header, error) {
	h := http.Header{"Accept": {"application/json"}}
	if !wallet {
		return h, nil
	}
	if strings.TrimSpace(c.credentials.Mnemonic) == "" {
		return nil, localValidation("Mnemonic is required for this operation")
	}
	if purchase && strings.TrimSpace(c.credentials.Cookie) == "" {
		return nil, localValidation("Cookie is required for purchases")
	}
	version := c.credentials.WalletVersion
	if version == "" {
		version = "auto"
	}
	if version != "auto" && version != "v5r1" && version != "v4r2" && version != "v3r2" {
		return nil, localValidation("Invalid Wallet-Version")
	}
	h.Set("Mnemonic", c.credentials.Mnemonic)
	h.Set("Wallet-Version", version)
	for k, v := range map[string]string{"Wallet-Address": c.credentials.WalletAddress, "Api-Key": c.credentials.ProviderKey} {
		if v != "" {
			h.Set(k, v)
		}
	}
	if purchase {
		h.Set("Cookie", c.credentials.Cookie)
		for k, v := range map[string]string{"Proxy": c.credentials.Proxy, "User-Agent": c.credentials.UserAgent} {
			if v != "" {
				h.Set(k, v)
			}
		}
	}
	for _, values := range h {
		for _, value := range values {
			if strings.ContainsAny(value, "\r\n") {
				return nil, localValidation("Invalid header value")
			}
		}
	}
	return h, nil
}

func (c *Client) request(ctx context.Context, method, path string, query, form url.Values, wallet, purchase bool) (map[string]json.RawMessage, error) {
	headers, err := c.credentialHeaders(wallet, purchase)
	if err != nil {
		return nil, err
	}
	u := *c.base
	u.Path = strings.TrimRight(c.base.Path, "/") + path
	if query != nil {
		u.RawQuery = query.Encode()
	}
	maxRetries := c.readRetries
	if purchase {
		maxRetries = 0
	}
	for attempt := 0; ; attempt++ {
		var body io.Reader
		if form != nil {
			body = strings.NewReader(form.Encode())
		}
		req, buildErr := http.NewRequestWithContext(ctx, method, u.String(), body)
		if buildErr != nil {
			return nil, &Error{Kind: NetworkError, Message: "Could not create request"}
		}
		req.Header = headers.Clone()
		if form != nil {
			req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
		}
		resp, transportErr := c.http.Do(req)
		var apiErr *Error
		var data map[string]json.RawMessage
		if transportErr != nil {
			kind := NetworkError
			var networkError net.Error
			if errors.Is(transportErr, context.DeadlineExceeded) || (errors.As(transportErr, &networkError) && networkError.Timeout()) {
				kind = TimeoutError
			}
			apiErr = &Error{Kind: kind, Message: "Transport failed; sensitive details omitted"}
		} else {
			raw, readErr := io.ReadAll(io.LimitReader(resp.Body, 4*1024*1024+1))
			resp.Body.Close()
			if readErr != nil {
				apiErr = &Error{Kind: NetworkError, StatusCode: resp.StatusCode, Message: "Response read failed"}
			} else if len(raw) > 4*1024*1024 {
				apiErr = &Error{Kind: MalformedResponseError, StatusCode: resp.StatusCode, Message: "Response too large"}
			} else {
				data, apiErr = c.parse(resp, raw, purchase)
			}
		}
		if apiErr == nil {
			return data, nil
		}
		if purchase && (apiErr.Kind == NetworkError || apiErr.Kind == TimeoutError || apiErr.Kind == MalformedResponseError ||
			(apiErr.StatusCode >= 500 && apiErr.Code != "RATE_LIMIT_UNAVAILABLE") || (apiErr.StatusCode >= 300 && apiErr.StatusCode < 400)) {
			apiErr.OutcomeUnknown = true
		}
		if attempt >= maxRetries || ctx.Err() != nil {
			return nil, apiErr
		}
		wait, retry := c.retryDelay(apiErr, attempt)
		if !retry {
			return nil, apiErr
		}
		if c.sleep(ctx, wait) != nil {
			return nil, &Error{Kind: TimeoutError, Message: "Retry wait cancelled"}
		}
	}
}

func (c *Client) parse(resp *http.Response, raw []byte, purchase bool) (map[string]json.RawMessage, *Error) {
	var data map[string]json.RawMessage
	err := json.Unmarshal(raw, &data)
	status := resp.StatusCode
	var unconfirmed bool
	if purchase && err == nil && json.Unmarshal(data["unconfirmed"], &unconfirmed) == nil && unconfirmed {
		message := "Purchase outcome unknown; reconcile manually and do not retry"
		for _, field := range []string{"error", "reason", "info", "message"} {
			if json.Unmarshal(data[field], &message) == nil && message != "" {
				break
			}
		}
		var code string
		_ = json.Unmarshal(data["error_code"], &code)
		return nil, &Error{Kind: PurchaseOutcomeUnknownError, StatusCode: status, OutcomeUnknown: true, Message: c.redact(message), Code: c.redact(code), RetryAfter: retryAfter(resp.Header.Get("Retry-After"), data, c.now()), Details: c.safeDetails(data)}
	}
	if status == 429 || status == 503 || status < 200 || status >= 300 {
		kind := APIError
		if status == 429 {
			kind = RateLimitError
		}
		if status == 503 {
			kind = UnavailableError
		}
		message, code := "HTTP request failed", ""
		if err == nil && data != nil {
			for _, field := range []string{"error", "reason", "info", "message"} {
				if json.Unmarshal(data[field], &message) == nil && message != "" {
					break
				}
			}
			_ = json.Unmarshal(data["error_code"], &code)
		}
		return nil, &Error{Kind: kind, StatusCode: status, Message: c.redact(message), Code: c.redact(code), RetryAfter: retryAfter(resp.Header.Get("Retry-After"), data, c.now()), Details: c.safeDetails(data)}
	}
	var ok bool
	if err != nil || data == nil || json.Unmarshal(data["ok"], &ok) != nil {
		return nil, &Error{Kind: MalformedResponseError, StatusCode: status, Message: "Expected JSON object with boolean ok"}
	}
	if !ok {
		message := "API reported failure"
		for _, field := range []string{"error", "reason", "info"} {
			if json.Unmarshal(data[field], &message) == nil && message != "" {
				break
			}
		}
		return nil, &Error{Kind: APIError, StatusCode: status, Message: c.redact(message), RetryAfter: retryAfter(resp.Header.Get("Retry-After"), data, c.now()), Details: c.safeDetails(data)}
	}
	return data, nil
}

func retryAfter(header string, data map[string]json.RawMessage, now time.Time) time.Duration {
	var wait time.Duration
	set := func(seconds float64) {
		if seconds >= 0 && seconds <= float64(365*24*60*60) {
			d := time.Duration(seconds * float64(time.Second))
			if d > wait {
				wait = d
			}
		}
	}
	if seconds, err := strconv.ParseFloat(strings.TrimSpace(header), 64); err == nil {
		set(seconds)
	} else if date, err := http.ParseTime(header); err == nil {
		set(date.Sub(now).Seconds())
	}
	for _, field := range []string{"retry_after", "flood_wait"} {
		var n json.Number
		if json.Unmarshal(data[field], &n) == nil {
			if seconds, err := n.Float64(); err == nil {
				set(seconds)
			}
		}
	}
	return wait
}

func (c *Client) retryDelay(err *Error, attempt int) (time.Duration, bool) {
	wait := time.Duration(1<<attempt) * time.Second
	if err.Kind == RateLimitError || err.Kind == UnavailableError {
		if !c.automaticWait {
			return 0, false
		}
		if err.RetryAfter > 0 {
			wait = err.RetryAfter
		}
	} else if err.Kind != NetworkError && err.Kind != TimeoutError && !(err.StatusCode >= 500 && err.StatusCode <= 599) {
		return 0, false
	}
	if wait > c.maxWait {
		return 0, false
	}
	return wait, true
}

func (c *Client) redact(value string) string {
	secrets := []string{c.credentials.Mnemonic, strings.Join(strings.Fields(c.credentials.Mnemonic), " "), c.credentials.Cookie, c.credentials.ProviderKey, c.credentials.Proxy}
	if proxy, err := url.Parse(c.credentials.Proxy); err == nil && proxy.User != nil {
		secrets = append(secrets, proxy.User.Username())
		if password, found := proxy.User.Password(); found {
			secrets = append(secrets, password)
		}
	}
	for _, part := range strings.Split(c.credentials.Cookie, ";") {
		if _, v, found := strings.Cut(strings.TrimSpace(part), "="); found {
			secrets = append(secrets, v, strings.Trim(v, "\""))
		}
	}
	variants := append([]string(nil), secrets...)
	for _, secret := range secrets {
		if decoded, err := url.QueryUnescape(secret); err == nil {
			variants = append(variants, decoded)
		}
		variants = append(variants, url.QueryEscape(secret), url.PathEscape(secret))
	}
	for _, secret := range variants {
		if secret != "" {
			value = strings.ReplaceAll(value, secret, "[REDACTED]")
		}
	}
	return value
}

func sensitiveField(key string) bool {
	key = strings.NewReplacer("-", "", "_", "").Replace(strings.ToLower(key))
	switch key {
	case "mnemonic", "seed", "cookie", "session", "stringsession", "password", "proxypassword", "proxy", "apikey", "providerkey", "authorization", "token":
		return true
	}
	return false
}

func (c *Client) safeDetails(data map[string]json.RawMessage) map[string]json.RawMessage {
	if data == nil {
		return nil
	}
	result := make(map[string]json.RawMessage, len(data))
	for key, raw := range data {
		var value any
		decoder := json.NewDecoder(strings.NewReader(string(raw)))
		decoder.UseNumber()
		if decoder.Decode(&value) != nil {
			continue
		}
		if sensitiveField(key) {
			value = "[REDACTED]"
		} else {
			value = c.safeValue(value)
		}
		cleaned, err := json.Marshal(value)
		if err == nil {
			result[key] = cleaned
		}
	}
	return result
}

func (c *Client) safeValue(value any) any {
	switch typed := value.(type) {
	case string:
		return c.redact(typed)
	case map[string]any:
		for key, item := range typed {
			if sensitiveField(key) {
				typed[key] = "[REDACTED]"
			} else {
				typed[key] = c.safeValue(item)
			}
		}
	case []any:
		for index, item := range typed {
			typed[index] = c.safeValue(item)
		}
	}
	return value
}
