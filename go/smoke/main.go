// An isolated consumer module: every request uses a synthetic local transport.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	donor "github.com/usnuz/fragment-donor-sdk/go"
)

type mock struct{ calls int }

func (m *mock) RoundTrip(r *http.Request) (*http.Response, error) {
	m.calls++
	if r.Header.Get("Authorization") != "" || r.Header.Get("X-Api-Key") != "" {
		panic("unexpected service auth")
	}
	body := `{"ok":true,"username":"durov","is_premium":false,"future_field":"kept"}`
	status := 200
	switch r.URL.Path {
	case "/wallet-balance/":
		body = `{"ok":true,"address":"SYNTHETIC_ADDRESS","ton":"2.500000001","usdt_ton":"9007199254740993.01","future_field":"kept"}`
	case "/buy-stars/", "/buy-premium/":
		if r.Method != "POST" || r.Header.Get("Mnemonic") != "SYNTHETIC_MNEMONIC" || r.Header.Get("Cookie") != "session=SYNTHETIC_COOKIE" || r.Header.Get("Content-Type") != "application/x-www-form-urlencoded" {
			panic("wrong purchase wire contract")
		}
		if r.ParseForm() != nil || r.Form.Get("username") != "durov" {
			panic("wrong form")
		}
		status = 400
		body = `{"ok":false,"unconfirmed":true,"tx_hash":"SYNTHETIC_TX_HASH","info":"Await confirmation SYNTHETIC_MNEMONIC","future_field":"kept"}`
	}
	return &http.Response{StatusCode: status, Header: make(http.Header), Body: io.NopCloser(strings.NewReader(body))}, nil
}

func main() {
	transport := &mock{}
	client, err := donor.NewClient(donor.Config{Transport: transport, ReadRetries: 2, AutomaticWait: true, Credentials: donor.Credentials{Mnemonic: "SYNTHETIC_MNEMONIC", Cookie: "session=SYNTHETIC_COOKIE"}})
	if err != nil {
		panic(err)
	}
	ctx := context.Background()
	user, err := client.GetUserInfo(ctx, "durov")
	if err != nil || !user.OK || string(user.Extra["future_field"]) != `"kept"` {
		panic("user consumer smoke failed")
	}
	balance, err := client.WalletBalance(ctx)
	if err != nil || balance.USDTTON != "9007199254740993.01" {
		panic("decimal consumer smoke failed")
	}
	for _, premium := range []bool{false, true} {
		before := transport.calls
		if premium {
			_, err = client.BuyPremium(ctx, "durov", 3, "")
		} else {
			_, err = client.BuyStars(ctx, "durov", 50, "")
		}
		var apiErr *donor.Error
		if !errors.As(err, &apiErr) || apiErr.Kind != donor.PurchaseOutcomeUnknownError || !apiErr.OutcomeUnknown || transport.calls != before+1 {
			panic("purchase consumer smoke failed")
		}
		details, _ := json.Marshal(apiErr.Details)
		if string(apiErr.Details["tx_hash"]) != `"SYNTHETIC_TX_HASH"` || strings.Contains(string(details), "SYNTHETIC_MNEMONIC") {
			panic("reconciliation/redaction failed")
		}
	}
	if transport.calls != 4 {
		panic("duplicate consumer requests")
	}
	fmt.Println("Go isolated consumer: four operations, unknown purchase outcome, redaction, exact balances PASS (source replace; not a public version probe)")
}
