use fragment_donor_sdk::*;
use serde_json::{json, Map, Value};
use std::collections::BTreeMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime};

fn fixture() -> Value {
    serde_json::from_str(include_str!("../../contract/fixtures.json")).unwrap()
}
fn credentials() -> Credentials {
    let f = fixture();
    Credentials {
        mnemonic: f["credentials"]["mnemonic"].as_str().unwrap().into(),
        cookie: f["credentials"]["cookie"].as_str().unwrap().into(),
        provider_key: f["credentials"]["provider_key"].as_str().unwrap().into(),
        wallet_version: "v5r1".into(),
        wallet_address: "SYNTHETIC_ADDRESS".into(),
        proxy: "http://SYNTHETIC_PROXY".into(),
        user_agent: "SYNTHETIC_AGENT".into(),
    }
}
type Handler = dyn Fn(&TransportRequest) -> Result<TransportResponse, TransportError> + Send + Sync;
struct MockTransport {
    handler: Box<Handler>,
}
impl Transport for MockTransport {
    fn send(&self, request: &TransportRequest) -> Result<TransportResponse, TransportError> {
        (self.handler)(request)
    }
}
fn config(
    handler: impl Fn(&TransportRequest) -> Result<TransportResponse, TransportError>
        + Send
        + Sync
        + 'static,
) -> Config {
    Config {
        credentials: credentials(),
        transport: Some(Arc::new(MockTransport {
            handler: Box::new(handler),
        })),
        sleeper: Some(Arc::new(|_| {})),
        ..Config::default()
    }
}
fn response(status: u16, body: Value) -> TransportResponse {
    TransportResponse {
        status,
        headers: BTreeMap::new(),
        body: body.to_string(),
    }
}

#[test]
fn all_operation_mappings_fields_and_decimal_precision() {
    for operation in [
        "get_user_info",
        "buy_stars",
        "buy_premium",
        "wallet_balance",
    ] {
        let calls = Arc::new(Mutex::new(0));
        let seen = calls.clone();
        let client = Client::new(config(move |request| {
            *seen.lock().unwrap() += 1;
            let f = fixture();
            let contract = &f["operations"][operation];
            let url = reqwest::Url::parse(&request.url).unwrap();
            assert_eq!(request.method, contract["method"].as_str().unwrap());
            assert_eq!(url.path(), contract["path"].as_str().unwrap());
            assert!(!request.headers.contains_key("Authorization"));
            assert!(!request.headers.contains_key("X-Api-Key"));
            if operation == "get_user_info" {
                assert_eq!(
                    url.query_pairs()
                        .collect::<BTreeMap<_, _>>()
                        .get("username")
                        .unwrap(),
                    "@durov"
                );
                assert!(!request.headers.contains_key("Mnemonic"));
                assert!(!request.headers.contains_key("Cookie"));
                return Ok(response(200, f["responses"]["user_info"].clone()));
            }
            let c = credentials();
            assert_eq!(request.headers["Mnemonic"], c.mnemonic);
            assert_eq!(request.headers["Api-Key"], c.provider_key);
            assert_eq!(request.headers["Wallet-Version"], "v5r1");
            assert_eq!(request.headers["Wallet-Address"], "SYNTHETIC_ADDRESS");
            if operation == "wallet_balance" {
                assert!(!request.headers.contains_key("Cookie"));
                assert!(!request.headers.contains_key("Proxy"));
                return Ok(response(200, f["responses"]["wallet_balance"].clone()));
            }
            assert_eq!(request.headers["Cookie"], c.cookie);
            assert_eq!(request.headers["Proxy"], "http://SYNTHETIC_PROXY");
            assert_eq!(request.headers["User-Agent"], "SYNTHETIC_AGENT");
            let form = request.form.as_ref().unwrap();
            assert_eq!(form["username"], "@durov");
            assert_eq!(form["payment_method"], "ton");
            if operation == "buy_stars" {
                assert_eq!(form["amount"], "50");
            } else {
                assert_eq!(form["duration"], "3");
            }
            Ok(response(200, f["responses"]["purchase"].clone()))
        }))
        .unwrap();
        let extra = match operation {
            "get_user_info" => client.get_user_info("@durov").unwrap().extra,
            "buy_stars" => client.buy_stars("@durov", 50, Some("ton")).unwrap().extra,
            "buy_premium" => client.buy_premium("@durov", 3, Some("ton")).unwrap().extra,
            _ => {
                let result = client.wallet_balance().unwrap();
                assert_eq!(result.ton, "2.500000001");
                assert_eq!(result.usdt_ton, "9007199254740993.01");
                result.extra
            }
        };
        assert!(extra.contains_key("future_field"));
        assert_eq!(*calls.lock().unwrap(), 1);
    }
}

#[test]
fn error_kinds_json_http_date_hints_and_malformed_payloads() {
    for (status, key, kind, wait) in [
        (400, "validation", ErrorKind::Validation, None),
        (429, "flood_wait", ErrorKind::RateLimit, Some(42)),
        (503, "unavailable", ErrorKind::Unavailable, Some(5)),
        (200, "upstream_error", ErrorKind::Api, None),
    ] {
        let client = Client::new(config(move |_| {
            Ok(response(status, fixture()["responses"][key].clone()))
        }))
        .unwrap();
        let error = client.get_user_info("durov").unwrap_err();
        assert_eq!(error.kind, kind);
        assert_eq!(error.retry_after, wait.map(Duration::from_secs));
    }
    for body in ["not JSON", "null", r#"{"ok":"true"}"#] {
        let client = Client::new(config(move |_| {
            Ok(TransportResponse {
                status: 200,
                headers: BTreeMap::new(),
                body: body.into(),
            })
        }))
        .unwrap();
        assert_eq!(
            client.get_user_info("durov").unwrap_err().kind,
            ErrorKind::MalformedResponse
        );
    }
    let now = SystemTime::UNIX_EPOCH + Duration::from_secs(1_767_225_600);
    let date = httpdate::fmt_http_date(now + Duration::from_secs(25));
    let mut cfg = config(move |_| {
        Ok(TransportResponse {
            status: 429,
            headers: BTreeMap::from([("Retry-After".into(), date.clone())]),
            body: r#"{"ok":false}"#.into(),
        })
    });
    cfg.clock = Some(Arc::new(move || now));
    assert_eq!(
        Client::new(cfg)
            .unwrap()
            .get_user_info("durov")
            .unwrap_err()
            .retry_after,
        Some(Duration::from_secs(25))
    );
}

#[test]
fn purchases_never_retry_for_any_failure() {
    for premium in [false, true] {
        for failure in ["429", "503", "500", "invalid", "timeout", "network"] {
            let calls = Arc::new(Mutex::new(0));
            let seen = calls.clone();
            let waits = Arc::new(Mutex::new(0));
            let waited = waits.clone();
            let mut cfg = config(move |_| {
                *seen.lock().unwrap() += 1;
                match failure {
                    "timeout" => Err(TransportError::Timeout),
                    "network" => Err(TransportError::Network),
                    "invalid" => Ok(TransportResponse {
                        status: 200,
                        headers: BTreeMap::new(),
                        body: "not JSON".into(),
                    }),
                    _ => Ok(response(
                        failure.parse().unwrap(),
                        json!({"ok":false,"retry_after":5}),
                    )),
                }
            });
            cfg.read_retries = 2;
            cfg.automatic_wait = true;
            cfg.sleeper = Some(Arc::new(move |_| *waited.lock().unwrap() += 1));
            let client = Client::new(cfg).unwrap();
            let result = if premium {
                client.buy_premium("durov", 3, None)
            } else {
                client.buy_stars("durov", 50, None)
            };
            assert!(result.is_err());
            assert_eq!(*calls.lock().unwrap(), 1);
            assert_eq!(*waits.lock().unwrap(), 0);
        }
    }
}

#[test]
fn read_retry_is_opt_in_bounded_and_respects_long_waits() {
    for (retries, auto, wait, expected) in [
        (0, false, 42, 1),
        (2, false, 42, 1),
        (2, true, 42, 3),
        (2, true, 61, 1),
    ] {
        let calls = Arc::new(Mutex::new(0));
        let seen = calls.clone();
        let mut cfg = config(move |_| {
            *seen.lock().unwrap() += 1;
            Ok(response(429, json!({"ok":false,"retry_after":wait})))
        });
        cfg.read_retries = retries;
        cfg.automatic_wait = auto;
        let client = Client::new(cfg).unwrap();
        assert!(client.get_user_info("durov").is_err());
        assert_eq!(*calls.lock().unwrap(), expected);
    }
}

#[test]
fn error_debug_and_configuration_redact_credentials() {
    let c = credentials();
    let message = format!("{} {} {}", c.mnemonic, c.cookie, c.provider_key);
    let cfg = config(move |_| Ok(response(400, json!({"ok":false,"error":message}))));
    let debug = format!("{:?} {:?}", cfg, c);
    let client = Client::new(cfg).unwrap();
    let error = client.buy_stars("durov", 50, None).unwrap_err();
    let output = format!("{} {:?} {:?} {}", error, error, client, debug);
    for secret in [&c.mnemonic, &c.cookie, &c.provider_key] {
        assert!(!output.contains(secret));
    }
    assert!(std::error::Error::source(&error).is_none());
}

#[test]
fn redirects_rejected_and_optional_provider_key_omitted() {
    let calls = Arc::new(Mutex::new(0));
    let seen = calls.clone();
    let client = Client::new(config(move |_| {
        *seen.lock().unwrap() += 1;
        Ok(TransportResponse {
            status: 307,
            headers: BTreeMap::from([("Location".into(), "https://example.invalid".into())]),
            body: String::new(),
        })
    }))
    .unwrap();
    assert_eq!(
        client.buy_stars("durov", 50, None).unwrap_err().status,
        Some(307)
    );
    assert_eq!(*calls.lock().unwrap(), 1);
    let mut cfg = config(|request| {
        assert!(!request.headers.contains_key("Api-Key"));
        Ok(response(
            200,
            fixture()["responses"]["wallet_balance"].clone(),
        ))
    });
    cfg.credentials.provider_key.clear();
    assert!(Client::new(cfg).unwrap().wallet_balance().is_ok());
}

#[test]
fn local_validation_makes_no_requests_and_balances_must_be_strings() {
    let client = Client::new(config(|_| panic!("unexpected request"))).unwrap();
    assert!(client.get_user_info("invalid username").is_err());
    assert!(client.buy_stars("durov", 49, None).is_err());
    assert!(client.buy_premium("durov", 1, None).is_err());
    assert!(client.buy_stars("durov", 50, Some("invalid")).is_err());
    let cfg = Config {
        base_url: "http://example.com".into(),
        ..Config::default()
    };
    assert!(Client::new(cfg).is_err());
    let cfg = Config {
        read_retries: 3,
        ..Config::default()
    };
    assert!(Client::new(cfg).is_err());
    let client = Client::new(config(|_| {
        Ok(response(
            200,
            json!({"ok":true,"address":"synthetic","ton":2.5,"usdt_ton":"1"}),
        ))
    }))
    .unwrap();
    assert_eq!(
        client.wallet_balance().unwrap_err().kind,
        ErrorKind::MalformedResponse
    );
}

#[test]
fn normalized_partial_secrets_and_response_debug_are_safe() {
    let mut c = credentials();
    let mut seed = c.mnemonic.split_whitespace().collect::<Vec<_>>().join(" ");
    if !seed.contains(' ') {
        seed = "SYNTHETIC_A SYNTHETIC_B".into();
    }
    c.mnemonic = seed.replace(' ', "   ");
    c.cookie = "stel_ssid=SYNTHETIC_COOKIE_TOKEN".into();
    c.proxy = "http://SYNTHETIC_PROXY_USER:SYNTHETIC_PROXY%20PASSWORD@example.invalid".into();
    let text = format!(
        "{} SYNTHETIC_COOKIE_TOKEN SYNTHETIC_PROXY_USER SYNTHETIC_PROXY PASSWORD",
        seed
    );
    let echoed = text.clone();
    let mut cfg = config(move |_| {
        Ok(response(
            400,
            json!({"ok":false,"error":echoed,"error_code":echoed}),
        ))
    });
    cfg.credentials = c;
    let error = Client::new(cfg)
        .unwrap()
        .buy_stars("durov", 50, None)
        .unwrap_err();
    let output = format!("{} {:?} {:?}", error.message, error.code, error);
    for secret in [
        seed.as_str(),
        "SYNTHETIC_COOKIE_TOKEN",
        "SYNTHETIC_PROXY_USER",
        "SYNTHETIC_PROXY PASSWORD",
    ] {
        assert!(!output.contains(secret));
    }
    let extra = Map::from_iter([("future_field".into(), Value::String(text.clone()))]);
    let user = UserInfo {
        ok: true,
        username: Some(text.clone()),
        is_premium: Some(false),
        extra: extra.clone(),
    };
    let purchase = Purchase {
        ok: true,
        data: Some(Value::String(text.clone())),
        extra: extra.clone(),
    };
    let wallet = WalletBalance {
        ok: true,
        address: text.clone(),
        ton: "1".into(),
        usdt_ton: "2".into(),
        extra,
    };
    let output = format!("{:?} {:?} {:?}", user, purchase, wallet);
    assert!(!output.contains("SYNTHETIC_COOKIE_TOKEN"));
    assert!(!output.contains(&seed));
    assert_eq!(wallet.extra["future_field"], Value::String(text));
}

#[test]
fn structured_errors_preserve_reconciliation_and_redact() {
    let c = credentials();
    let body = json!({"ok":false,"info":"Transaction unconfirmed","tx_hash":"SYNTHETIC_TX_HASH","unconfirmed":true,"transient":true,"future_field":{"balance":"9007199254740993.01","echo":c.mnemonic,"cookie":"ANOTHER_SYNTHETIC_SECRET","array":[c.provider_key]}});
    let client = Client::new(config(move |_| Ok(response(400, body.clone())))).unwrap();
    let error = client.buy_stars("durov", 50, None).unwrap_err();
    assert_eq!(error.message, "Transaction unconfirmed");
    assert_eq!(error.details["tx_hash"], "SYNTHETIC_TX_HASH");
    assert_eq!(error.details["unconfirmed"], true);
    assert_eq!(error.details["transient"], true);
    assert_eq!(
        error.details["future_field"]["balance"],
        "9007199254740993.01"
    );
    let encoded = serde_json::to_string(&error.details).unwrap();
    for secret in [
        c.mnemonic.as_str(),
        c.provider_key.as_str(),
        "ANOTHER_SYNTHETIC_SECRET",
    ] {
        assert!(!encoded.contains(secret));
    }
}
