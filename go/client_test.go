package fragmentdonor

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

type fixture struct {
	Credentials struct {
		Mnemonic    string `json:"mnemonic"`
		Cookie      string `json:"cookie"`
		ProviderKey string `json:"provider_key"`
	} `json:"credentials"`
	Responses  map[string]json.RawMessage `json:"responses"`
	Operations map[string]struct {
		Method string `json:"method"`
		Path   string `json:"path"`
	} `json:"operations"`
}

func loadFixture(t *testing.T) fixture {
	t.Helper()
	raw, err := os.ReadFile("../contract/fixtures.json")
	if err != nil {
		t.Fatal(err)
	}
	var f fixture
	if err := json.Unmarshal(raw, &f); err != nil {
		t.Fatal(err)
	}
	return f
}
func newMock(t *testing.T, f fixture, transport roundTripFunc, opts func(*Config)) *Client {
	t.Helper()
	cfg := Config{Credentials: Credentials{Mnemonic: f.Credentials.Mnemonic, Cookie: f.Credentials.Cookie, ProviderKey: f.Credentials.ProviderKey, WalletVersion: "v5r1", WalletAddress: "SYNTHETIC_ADDRESS", Proxy: "http://SYNTHETIC_PROXY", UserAgent: "SYNTHETIC_AGENT"}, Transport: transport, Sleep: func(context.Context, time.Duration) error { return nil }}
	if opts != nil {
		opts(&cfg)
	}
	c, err := NewClient(cfg)
	if err != nil {
		t.Fatal(err)
	}
	return c
}
func response(status int, body []byte, headers http.Header) *http.Response {
	if headers == nil {
		headers = make(http.Header)
	}
	return &http.Response{StatusCode: status, Header: headers, Body: io.NopCloser(strings.NewReader(string(body)))}
}

func TestAllOperationMappingAndUnknownFields(t *testing.T) {
	f := loadFixture(t)
	for _, op := range []string{"get_user_info", "buy_stars", "buy_premium", "wallet_balance"} {
		t.Run(op, func(t *testing.T) {
			calls := 0
			c := newMock(t, f, func(r *http.Request) (*http.Response, error) {
				calls++
				contract := f.Operations[op]
				if r.Method != contract.Method || r.URL.Path != contract.Path {
					t.Fatalf("wrong mapping: %s %s", r.Method, r.URL.Path)
				}
				if r.Header.Get("Authorization") != "" || r.Header.Get("X-Api-Key") != "" {
					t.Fatal("service auth unexpectedly sent")
				}
				if op == "get_user_info" {
					if r.URL.Query().Get("username") != "@durov" {
						t.Fatal("wrong query")
					}
					if r.Header.Get("Mnemonic") != "" || r.Header.Get("Cookie") != "" || r.Header.Get("Api-Key") != "" {
						t.Fatal("read endpoint received credentials")
					}
					return response(200, f.Responses["user_info"], nil), nil
				}
				if r.Header.Get("Mnemonic") != f.Credentials.Mnemonic || r.Header.Get("Api-Key") != f.Credentials.ProviderKey || r.Header.Get("Wallet-Version") != "v5r1" || r.Header.Get("Wallet-Address") != "SYNTHETIC_ADDRESS" {
					t.Fatal("incorrect credential mapping")
				}
				if op == "wallet_balance" {
					if r.Header.Get("Cookie") != "" || r.Header.Get("Proxy") != "" {
						t.Fatal("unneeded wallet credentials")
					}
					return response(200, f.Responses["wallet_balance"], nil), nil
				}
				if r.Header.Get("Cookie") != f.Credentials.Cookie || r.Header.Get("Proxy") != "http://SYNTHETIC_PROXY" || r.Header.Get("User-Agent") != "SYNTHETIC_AGENT" {
					t.Fatal("incorrect purchase header")
				}
				if r.Header.Get("Content-Type") != "application/x-www-form-urlencoded" {
					t.Fatal("not form encoded")
				}
				raw, _ := io.ReadAll(r.Body)
				form, _ := url.ParseQuery(string(raw))
				if form.Get("username") != "@durov" || form.Get("payment_method") != "ton" {
					t.Fatal("incorrect form")
				}
				if op == "buy_stars" && form.Get("amount") != "50" {
					t.Fatal("wrong stars amount")
				}
				if op == "buy_premium" && form.Get("duration") != "3" {
					t.Fatal("wrong duration")
				}
				return response(200, f.Responses["purchase"], nil), nil
			}, nil)
			ctx := context.Background()
			var extra map[string]json.RawMessage
			switch op {
			case "get_user_info":
				result, err := c.GetUserInfo(ctx, "@durov")
				if err != nil {
					t.Fatal(err)
				}
				extra = result.Extra
			case "buy_stars":
				result, err := c.BuyStars(ctx, "@durov", 50, "ton")
				if err != nil {
					t.Fatal(err)
				}
				extra = result.Extra
			case "buy_premium":
				result, err := c.BuyPremium(ctx, "@durov", 3, "ton")
				if err != nil {
					t.Fatal(err)
				}
				extra = result.Extra
			case "wallet_balance":
				result, err := c.WalletBalance(ctx)
				if err != nil {
					t.Fatal(err)
				}
				extra = result.Extra
				if result.USDTTON != "9007199254740993.01" || result.TON != "2.500000001" {
					t.Fatal("decimal precision lost")
				}
			}
			if extra["future_field"] == nil || calls != 1 {
				t.Fatal("unknown response lost or request repeated")
			}
		})
	}
}

func TestErrorKindsAndRetryHints(t *testing.T) {
	f := loadFixture(t)
	for _, tc := range []struct {
		name   string
		status int
		body   []byte
		header string
		kind   ErrorKind
		wait   time.Duration
	}{
		{"validation", 400, f.Responses["validation"], "", ValidationError, 0},
		{"flood", 429, f.Responses["flood_wait"], "30", RateLimitError, 42 * time.Second},
		{"unavailable", 503, f.Responses["unavailable"], "", UnavailableError, 5 * time.Second},
		{"malformed", 200, []byte("not json"), "", MalformedResponseError, 0},
		{"json false", 200, f.Responses["upstream_error"], "", APIError, 0},
		{"null", 200, []byte("null"), "", MalformedResponseError, 0},
		{"wrong ok", 200, []byte(`{"ok":"true"}`), "", MalformedResponseError, 0},
	} {
		t.Run(tc.name, func(t *testing.T) {
			c := newMock(t, f, func(*http.Request) (*http.Response, error) {
				return response(tc.status, tc.body, http.Header{"Retry-After": {tc.header}}), nil
			}, nil)
			_, err := c.GetUserInfo(context.Background(), "durov")
			var apiErr *Error
			if !errors.As(err, &apiErr) || apiErr.Kind != tc.kind || apiErr.RetryAfter != tc.wait {
				t.Fatalf("unexpected error: %#v", err)
			}
		})
	}
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	if got := retryAfter(now.Add(25*time.Second).Format(http.TimeFormat), nil, now); got != 25*time.Second {
		t.Fatalf("HTTP date failed: %s", got)
	}
}

func TestPurchasesNeverRetry(t *testing.T) {
	f := loadFixture(t)
	for _, premium := range []bool{false, true} {
		for _, tc := range []struct {
			name    string
			status  int
			body    []byte
			network error
		}{
			{"429", 429, f.Responses["flood_wait"], nil},
			{"503", 503, f.Responses["unavailable"], nil},
			{"500", 500, []byte(`{"ok":false}`), nil},
			{"invalid json", 200, []byte("bad"), nil},
			{"timeout", 0, nil, context.DeadlineExceeded},
			{"reset", 0, nil, errors.New("transport exposed " + f.Credentials.Mnemonic)},
		} {
			t.Run(fmt.Sprintf("premium=%t/%s", premium, tc.name), func(t *testing.T) {
				calls, waits := 0, 0
				c := newMock(t, f, func(*http.Request) (*http.Response, error) {
					calls++
					if tc.network != nil {
						return nil, tc.network
					}
					return response(tc.status, tc.body, nil), nil
				}, func(cfg *Config) {
					cfg.ReadRetries = 2
					cfg.AutomaticWait = true
					cfg.Sleep = func(context.Context, time.Duration) error { waits++; return nil }
				})
				var err error
				if premium {
					_, err = c.BuyPremium(context.Background(), "durov", 3, "")
				} else {
					_, err = c.BuyStars(context.Background(), "durov", 50, "")
				}
				if err == nil || calls != 1 || waits != 0 {
					t.Fatalf("purchase retried: calls=%d waits=%d err=%v", calls, waits, err)
				}
				if strings.Contains(fmt.Sprintf("%#v", err), f.Credentials.Mnemonic) {
					t.Fatal("transport credentials leaked")
				}
			})
		}
	}
}

func TestReadRetriesAreOptInAndBounded(t *testing.T) {
	f := loadFixture(t)
	for _, tc := range []struct {
		name    string
		retries int
		auto    bool
		status  int
		wait    int
		calls   int
	}{
		{"default", 0, false, 429, 42, 1},
		{"needs auto wait", 2, false, 429, 42, 1},
		{"bounded flood", 2, true, 429, 42, 3},
		{"too long", 2, true, 429, 61, 1},
		{"bounded unavailable", 2, true, 503, 5, 3},
	} {
		t.Run(tc.name, func(t *testing.T) {
			calls := 0
			c := newMock(t, f, func(*http.Request) (*http.Response, error) {
				calls++
				return response(tc.status, []byte(fmt.Sprintf(`{"ok":false,"retry_after":%d}`, tc.wait)), nil), nil
			}, func(cfg *Config) { cfg.ReadRetries = tc.retries; cfg.AutomaticWait = tc.auto })
			_, err := c.GetUserInfo(context.Background(), "durov")
			if err == nil || calls != tc.calls {
				t.Fatalf("wrong bounded retries %d", calls)
			}
		})
	}
}

func TestCredentialsRedactedInErrorsAndDebug(t *testing.T) {
	f := loadFixture(t)
	body, _ := json.Marshal(map[string]any{"ok": false, "error": f.Credentials.Mnemonic + " " + f.Credentials.Cookie + " " + f.Credentials.ProviderKey})
	c := newMock(t, f, func(*http.Request) (*http.Response, error) { return response(400, body, nil), nil }, nil)
	_, err := c.BuyStars(context.Background(), "durov", 50, "")
	debug := fmt.Sprintf("%v %#v %+v", err, err, c)
	if strings.Contains(debug, f.Credentials.Mnemonic) || strings.Contains(debug, f.Credentials.Cookie) || strings.Contains(debug, f.Credentials.ProviderKey) {
		t.Fatal("sensitive error repr")
	}
	config := Config{Credentials: c.credentials}
	raw, _ := json.Marshal(config)
	for _, out := range []string{fmt.Sprintf("%#v", config), fmt.Sprintf("%+v", c.credentials), string(raw)} {
		if strings.Contains(out, f.Credentials.Mnemonic) {
			t.Fatal("configuration leak")
		}
	}
}

func TestRedirectNotFollowed(t *testing.T) {
	f := loadFixture(t)
	targetCalls := 0
	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { targetCalls++; w.Write(f.Responses["purchase"]) }))
	defer target.Close()
	source := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, target.URL, http.StatusTemporaryRedirect)
	}))
	defer source.Close()
	c, err := NewClient(Config{BaseURL: source.URL, AllowLocalHTTP: true, Credentials: Credentials{Mnemonic: f.Credentials.Mnemonic, Cookie: f.Credentials.Cookie}})
	if err != nil {
		t.Fatal(err)
	}
	_, err = c.BuyStars(context.Background(), "durov", 50, "")
	if err == nil || targetCalls != 0 {
		t.Fatal("redirect followed")
	}
}

func TestValidationDoesNotCallNetwork(t *testing.T) {
	f := loadFixture(t)
	c := newMock(t, f, func(*http.Request) (*http.Response, error) { t.Fatal("unexpected request"); return nil, nil }, nil)
	ctx := context.Background()
	checks := []func() error{
		func() error { _, e := c.GetUserInfo(ctx, "bad username"); return e },
		func() error { _, e := c.BuyStars(ctx, "durov", 49, ""); return e },
		func() error { _, e := c.BuyPremium(ctx, "durov", 1, ""); return e },
		func() error { _, e := c.BuyStars(ctx, "durov", 50, "invalid"); return e },
	}
	for _, check := range checks {
		if check() == nil {
			t.Fatal("validation accepted")
		}
	}
	for _, cfg := range []Config{{BaseURL: "http://example.com"}, {BaseURL: "https://SYNTHETIC_USER:SYNTHETIC_PASS@example.invalid"}, {ReadRetries: 3}, {MaxWait: 61 * time.Second}} {
		if _, e := NewClient(cfg); e == nil {
			t.Fatal("invalid config accepted")
		}
	}
}

func TestNormalizedAndPartialSecretsAndResponseDebug(t *testing.T) {
	f := loadFixture(t)
	seed := strings.Join(strings.Fields(f.Credentials.Mnemonic), " ")
	if !strings.Contains(seed, " ") {
		seed = "SYNTHETIC_A SYNTHETIC_B"
	}
	const proxy = "http://SYNTHETIC_PROXY_USER:SYNTHETIC_PROXY%20PASSWORD@example.invalid"
	const token = "SYNTHETIC_COOKIE_TOKEN"
	var normalized, proxyUser, proxyPassword, cookieToken string
	message := seed + " SYNTHETIC_PROXY_USER SYNTHETIC_PROXY PASSWORD " + token
	body, _ := json.Marshal(map[string]any{"ok": false, "error": message, "error_code": message})
	c := newMock(t, f, func(*http.Request) (*http.Response, error) { return response(400, body, nil), nil }, func(cfg *Config) {
		cfg.Credentials.Mnemonic = strings.ReplaceAll(seed, " ", "   ")
		cfg.Credentials.Proxy = proxy
		cfg.Credentials.Cookie = "stel_ssid=" + token
	})
	_, err := c.BuyStars(context.Background(), "durov", 50, "")
	var apiErr *Error
	if !errors.As(err, &apiErr) {
		t.Fatal("expected API error")
	}
	normalized, proxyUser, proxyPassword, cookieToken = seed, "SYNTHETIC_PROXY_USER", "SYNTHETIC_PROXY PASSWORD", token
	for _, secret := range []string{normalized, proxyUser, proxyPassword, cookieToken} {
		if strings.Contains(apiErr.Message, secret) || strings.Contains(apiErr.Code, secret) || strings.Contains(fmt.Sprintf("%#v", apiErr), secret) {
			t.Fatal("partial credential leaked")
		}
	}
	unknown := map[string]json.RawMessage{"future_field": json.RawMessage(strconv.Quote(message))}
	for _, model := range []any{UserInfo{Username: message, Extra: unknown}, Purchase{Data: json.RawMessage(strconv.Quote(message)), Extra: unknown}, WalletBalance{Address: message, Extra: unknown}} {
		if output := fmt.Sprintf("%v %+v %#v", model, model, model); strings.Contains(output, token) || strings.Contains(output, seed) {
			t.Fatal("response debug leak")
		}
	}
}

func TestCustomGlobalDefaultTransportDoesNotPanic(t *testing.T) {
	original := http.DefaultTransport
	defer func() { http.DefaultTransport = original }()
	http.DefaultTransport = roundTripFunc(func(*http.Request) (*http.Response, error) {
		t.Fatal("custom global transport should not be used implicitly")
		return nil, nil
	})
	client, err := NewClient(Config{})
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := client.http.Transport.(*http.Transport); !ok {
		t.Fatal("expected owned fallback transport")
	}
}

func TestStructuredErrorDetailsPreserveReconciliationAndRedact(t *testing.T) {
	f := loadFixture(t)
	body, _ := json.Marshal(map[string]any{"ok": false, "info": "Transaction unconfirmed", "tx_hash": "SYNTHETIC_TX_HASH", "unconfirmed": true, "transient": true, "future_field": map[string]any{"balance": "9007199254740993.01", "echo": f.Credentials.Mnemonic, "cookie": "ANOTHER_SYNTHETIC_SECRET", "array": []any{f.Credentials.ProviderKey}}})
	c := newMock(t, f, func(*http.Request) (*http.Response, error) { return response(400, body, nil), nil }, nil)
	_, err := c.BuyStars(context.Background(), "durov", 50, "")
	var apiErr *Error
	if !errors.As(err, &apiErr) || apiErr.Message != "Transaction unconfirmed" {
		t.Fatalf("info fallback missing: %v", err)
	}
	if string(apiErr.Details["tx_hash"]) != `"SYNTHETIC_TX_HASH"` || string(apiErr.Details["unconfirmed"]) != "true" || string(apiErr.Details["transient"]) != "true" {
		t.Fatal("reconciliation fields lost")
	}
	encoded, _ := json.Marshal(apiErr.Details)
	for _, secret := range []string{f.Credentials.Mnemonic, f.Credentials.ProviderKey, "ANOTHER_SYNTHETIC_SECRET"} {
		if strings.Contains(string(encoded), secret) {
			t.Fatal("structured details leaked credential")
		}
	}
	if !strings.Contains(string(encoded), "9007199254740993.01") {
		t.Fatal("extra decimal lost")
	}
}
