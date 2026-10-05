use fragment_donor_sdk::*;
use std::collections::BTreeMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

struct MockTransport {
    calls: Arc<AtomicUsize>,
}
impl Transport for MockTransport {
    fn send(&self, request: &TransportRequest) -> Result<TransportResponse, TransportError> {
        self.calls.fetch_add(1, Ordering::SeqCst);
        assert!(!request.headers.contains_key("Authorization"));
        assert!(!request.headers.contains_key("X-Api-Key"));
        let (status, body) = if request.url.ends_with("/wallet-balance/") {
            (
                200,
                r#"{"ok":true,"address":"SYNTHETIC_ADDRESS","ton":"2.500000001","usdt_ton":"9007199254740993.01","future_field":"kept"}"#,
            )
        } else if request.method == "POST" {
            assert_eq!(request.headers["Mnemonic"], "SYNTHETIC_MNEMONIC");
            assert_eq!(request.headers["Cookie"], "session=SYNTHETIC_COOKIE");
            assert_eq!(request.form.as_ref().unwrap()["username"], "durov");
            (
                400,
                r#"{"ok":false,"unconfirmed":true,"tx_hash":"SYNTHETIC_TX_HASH","info":"Await confirmation SYNTHETIC_MNEMONIC","future_field":"kept"}"#,
            )
        } else {
            (
                200,
                r#"{"ok":true,"username":"durov","is_premium":false,"future_field":"kept"}"#,
            )
        };
        Ok(TransportResponse {
            status,
            headers: BTreeMap::new(),
            body: body.into(),
        })
    }
}

fn main() {
    let calls = Arc::new(AtomicUsize::new(0));
    let client = Client::new(Config {
        credentials: Credentials {
            mnemonic: "SYNTHETIC_MNEMONIC".into(),
            cookie: "session=SYNTHETIC_COOKIE".into(),
            ..Credentials::default()
        },
        transport: Some(Arc::new(MockTransport {
            calls: calls.clone(),
        })),
        read_retries: 2,
        automatic_wait: true,
        ..Config::default()
    })
    .unwrap();
    let user = client.get_user_info("durov").unwrap();
    assert!(user.ok);
    assert_eq!(user.extra["future_field"], "kept");
    let balance = client.wallet_balance().unwrap();
    assert_eq!(balance.usdt_ton, "9007199254740993.01");
    for premium in [false, true] {
        let before = calls.load(Ordering::SeqCst);
        let error = if premium {
            client.buy_premium("durov", 3, None)
        } else {
            client.buy_stars("durov", 50, None)
        }
        .unwrap_err();
        assert_eq!(error.kind, ErrorKind::PurchaseOutcomeUnknown);
        assert!(error.outcome_unknown);
        assert_eq!(error.details["tx_hash"], "SYNTHETIC_TX_HASH");
        assert_eq!(error.details["info"], "Await confirmation [REDACTED]");
        assert_eq!(calls.load(Ordering::SeqCst), before + 1);
    }
    assert_eq!(calls.load(Ordering::SeqCst), 4);
    println!("Rust built-crate consumer: four operations, purchase uncertainty, redaction, precision PASS");
}
