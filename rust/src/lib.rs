//! Independent server-side client for Fragment Donor. No service login/API key.
//! Purchases never retry and no request follows redirects.

use percent_encoding::{percent_decode_str, utf8_percent_encode, NON_ALPHANUMERIC};
use reqwest::{blocking, redirect, Url};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::{Map, Value};
use std::collections::BTreeMap;
use std::fmt;
use std::io::Read;
use std::sync::Arc;
use std::time::{Duration, SystemTime};

pub const VERSION: &str = "0.1.2";
pub const DEFAULT_BASE_URL: &str = "https://fragment.donor.uz";

/// Wallet/Fragment credentials, not service authentication. Debug is redacted.
#[derive(Clone)]
pub struct Credentials {
    pub mnemonic: String,
    pub cookie: String,
    pub wallet_version: String,
    pub wallet_address: String,
    pub provider_key: String,
    pub proxy: String,
    pub user_agent: String,
}

impl Default for Credentials {
    fn default() -> Self {
        Self {
            mnemonic: String::new(),
            cookie: String::new(),
            wallet_version: "auto".into(),
            wallet_address: String::new(),
            provider_key: String::new(),
            proxy: String::new(),
            user_agent: String::new(),
        }
    }
}
impl fmt::Debug for Credentials {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("Credentials { [REDACTED] }")
    }
}

/// Injectable transports must not perform hidden retries, redirects or logging.
pub trait Transport: Send + Sync {
    fn send(&self, request: &TransportRequest) -> Result<TransportResponse, TransportError>;
}

pub struct TransportRequest {
    pub method: &'static str,
    pub url: String,
    pub headers: BTreeMap<String, String>,
    pub form: Option<BTreeMap<String, String>>,
}
impl fmt::Debug for TransportRequest {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "TransportRequest {{ method: {}, [REDACTED] }}",
            self.method
        )
    }
}
pub struct TransportResponse {
    pub status: u16,
    pub headers: BTreeMap<String, String>,
    pub body: String,
}
/// Raw error strings are deliberately not accepted or retained.
#[derive(Clone, Copy, Debug)]
pub enum TransportError {
    Timeout,
    Network,
}

type Sleeper = Arc<dyn Fn(Duration) + Send + Sync>;
type Clock = Arc<dyn Fn() -> SystemTime + Send + Sync>;

pub struct Config {
    pub base_url: String,
    pub credentials: Credentials,
    pub connect_timeout: Duration,
    pub request_timeout: Duration,
    pub read_retries: u8,
    pub automatic_wait: bool,
    pub max_wait: Duration,
    pub transport: Option<Arc<dyn Transport>>,
    pub sleeper: Option<Sleeper>,
    pub clock: Option<Clock>,
    pub allow_local_http: bool,
}
impl Default for Config {
    fn default() -> Self {
        Self {
            base_url: DEFAULT_BASE_URL.into(),
            credentials: Credentials::default(),
            connect_timeout: Duration::from_secs(5),
            request_timeout: Duration::from_secs(30),
            read_retries: 0,
            automatic_wait: false,
            max_wait: Duration::from_secs(60),
            transport: None,
            sleeper: None,
            clock: None,
            allow_local_http: false,
        }
    }
}
impl fmt::Debug for Config {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("Config { credentials and transport [REDACTED] }")
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ErrorKind {
    Validation,
    Api,
    RateLimit,
    Unavailable,
    Timeout,
    Network,
    MalformedResponse,
    PurchaseOutcomeUnknown,
}

/// Safe to format: contains no request dumps, raw transport causes or secrets.
pub struct Error {
    pub kind: ErrorKind,
    pub status: Option<u16>,
    pub code: Option<String>,
    pub retry_after: Option<Duration>,
    pub message: String,
    /// Purchase may already have spent funds. False is not a rejection guarantee.
    pub outcome_unknown: bool,
    /// Recursively redacted JSON fields, including reconciliation/unknown fields.
    pub details: Map<String, Value>,
}
impl Error {
    fn new(kind: ErrorKind, message: &str) -> Self {
        Self {
            kind,
            status: None,
            code: None,
            retry_after: None,
            message: message.into(),
            outcome_unknown: false,
            details: Map::new(),
        }
    }
}
impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "Fragment Donor {:?} ({:?}): {}",
            self.kind, self.status, self.message
        )
    }
}
impl fmt::Debug for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        fmt::Display::fmt(self, f)
    }
}
impl std::error::Error for Error {}

#[derive(Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub ok: bool,
    pub username: Option<String>,
    pub is_premium: Option<bool>,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}
#[derive(Clone, Serialize, Deserialize)]
pub struct Purchase {
    pub ok: bool,
    pub data: Option<Value>,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}
#[derive(Clone, Serialize, Deserialize)]
pub struct WalletBalance {
    pub ok: bool,
    pub address: String,
    /// Exact decimal string; never convert balances to f64.
    pub ton: String,
    pub usdt_ton: String,
    #[serde(flatten)]
    pub extra: Map<String, Value>,
}

macro_rules! safe_response_debug {
    ($name:ident) => {
        impl fmt::Debug for $name {
            fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
                f.write_str(concat!(stringify!($name), " { response [REDACTED] }"))
            }
        }
    };
}
safe_response_debug!(UserInfo);
safe_response_debug!(Purchase);
safe_response_debug!(WalletBalance);

struct ReqwestTransport {
    client: blocking::Client,
}
impl ReqwestTransport {
    fn new(connect_timeout: Duration, request_timeout: Duration) -> Result<Self, Error> {
        let client = blocking::Client::builder()
            .connect_timeout(connect_timeout)
            .timeout(request_timeout)
            .redirect(redirect::Policy::none())
            .retry(reqwest::retry::never())
            .no_proxy()
            .build()
            .map_err(|_| Error::new(ErrorKind::Network, "Could not initialize transport"))?;
        Ok(Self { client })
    }
}
impl Transport for ReqwestTransport {
    fn send(&self, request: &TransportRequest) -> Result<TransportResponse, TransportError> {
        let mut builder = if request.method == "GET" {
            self.client.get(&request.url)
        } else {
            self.client.post(&request.url)
        };
        for (key, value) in &request.headers {
            let mut value = reqwest::header::HeaderValue::from_str(value)
                .map_err(|_| TransportError::Network)?;
            if matches!(key.as_str(), "Mnemonic" | "Cookie" | "Api-Key" | "Proxy") {
                value.set_sensitive(true);
            }
            builder = builder.header(key, value);
        }
        if let Some(form) = &request.form {
            builder = builder.form(form);
        }
        let response = builder.send().map_err(|error| {
            if error.is_timeout() {
                TransportError::Timeout
            } else {
                TransportError::Network
            }
        })?;
        let status = response.status().as_u16();
        let headers = response
            .headers()
            .iter()
            .filter_map(|(name, value)| {
                value
                    .to_str()
                    .ok()
                    .map(|value| (name.to_string(), value.to_owned()))
            })
            .collect();
        let mut body = String::new();
        response
            .take(4 * 1024 * 1024 + 1)
            .read_to_string(&mut body)
            .map_err(|_| TransportError::Network)?;
        Ok(TransportResponse {
            status,
            headers,
            body,
        })
    }
}

pub struct Client {
    base: Url,
    credentials: Credentials,
    transport: Arc<dyn Transport>,
    read_retries: u8,
    automatic_wait: bool,
    max_wait: Duration,
    sleeper: Sleeper,
    clock: Clock,
}
impl fmt::Debug for Client {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("FragmentDonorClient { credentials [REDACTED] }")
    }
}

impl Client {
    pub fn new(config: Config) -> Result<Self, Error> {
        let base = Url::parse(&config.base_url)
            .map_err(|_| Error::new(ErrorKind::Validation, "Invalid base URL"))?;
        let loopback = matches!(
            base.host_str(),
            Some("localhost" | "127.0.0.1" | "[::1]" | "::1")
        );
        if base.host_str().is_none()
            || !base.username().is_empty()
            || base.password().is_some()
            || base.query().is_some()
            || base.fragment().is_some()
            || !(base.scheme() == "https"
                || (config.allow_local_http && base.scheme() == "http" && loopback))
        {
            return Err(Error::new(
                ErrorKind::Validation,
                "HTTPS base URL without credentials/query is required",
            ));
        }
        if config.read_retries > 2
            || config.connect_timeout.is_zero()
            || config.request_timeout.is_zero()
            || config.max_wait.is_zero()
            || config.max_wait > Duration::from_secs(60)
        {
            return Err(Error::new(
                ErrorKind::Validation,
                "Invalid retry/timeout configuration",
            ));
        }
        let transport = match config.transport {
            Some(transport) => transport,
            None => Arc::new(ReqwestTransport::new(
                config.connect_timeout,
                config.request_timeout,
            )?),
        };
        Ok(Self {
            base,
            credentials: config.credentials,
            transport,
            read_retries: config.read_retries,
            automatic_wait: config.automatic_wait,
            max_wait: config.max_wait,
            sleeper: config
                .sleeper
                .unwrap_or_else(|| Arc::new(std::thread::sleep)),
            clock: config.clock.unwrap_or_else(|| Arc::new(SystemTime::now)),
        })
    }

    pub fn get_user_info(&self, username: &str) -> Result<UserInfo, Error> {
        validate_username(username)?;
        let query = BTreeMap::from([("username".to_owned(), username.to_owned())]);
        self.request("GET", "/get-user-info/", Some(query), None, false, false)
    }

    /// Makes at most one HTTP attempt; payment outcome can be unknown on timeout.
    pub fn buy_stars(
        &self,
        username: &str,
        amount: u32,
        payment_method: Option<&str>,
    ) -> Result<Purchase, Error> {
        validate_username(username)?;
        if !(50..=1_000_000).contains(&amount) {
            return Err(Error::new(
                ErrorKind::Validation,
                "Stars amount must be 50..1000000",
            ));
        }
        self.buy("/buy-stars/", username, "amount", amount, payment_method)
    }

    pub fn buy_premium(
        &self,
        username: &str,
        duration: u32,
        payment_method: Option<&str>,
    ) -> Result<Purchase, Error> {
        validate_username(username)?;
        if ![3, 6, 12].contains(&duration) {
            return Err(Error::new(
                ErrorKind::Validation,
                "Premium duration must be 3, 6 or 12",
            ));
        }
        self.buy(
            "/buy-premium/",
            username,
            "duration",
            duration,
            payment_method,
        )
    }

    /// Uses GET; backend also supports POST for this read-only endpoint.
    pub fn wallet_balance(&self) -> Result<WalletBalance, Error> {
        self.request("GET", "/wallet-balance/", None, None, true, false)
    }

    fn buy(
        &self,
        path: &str,
        username: &str,
        field: &str,
        quantity: u32,
        payment_method: Option<&str>,
    ) -> Result<Purchase, Error> {
        let mut form = BTreeMap::from([
            ("username".to_owned(), username.to_owned()),
            (field.to_owned(), quantity.to_string()),
        ]);
        if let Some(method) = payment_method {
            if !["usdt_ton", "ton"].contains(&method) {
                return Err(Error::new(
                    ErrorKind::Validation,
                    "payment_method must be usdt_ton or ton",
                ));
            }
            form.insert("payment_method".into(), method.into());
        }
        self.request("POST", path, None, Some(form), true, true)
    }

    fn headers(&self, wallet: bool, purchase: bool) -> Result<BTreeMap<String, String>, Error> {
        let mut headers = BTreeMap::from([("Accept".into(), "application/json".into())]);
        if !wallet {
            return Ok(headers);
        }
        if self.credentials.mnemonic.trim().is_empty() {
            return Err(Error::new(
                ErrorKind::Validation,
                "Mnemonic is required for wallet/purchase operations",
            ));
        }
        if purchase && self.credentials.cookie.trim().is_empty() {
            return Err(Error::new(
                ErrorKind::Validation,
                "Cookie is required for purchases",
            ));
        }
        let version = if self.credentials.wallet_version.is_empty() {
            "auto"
        } else {
            &self.credentials.wallet_version
        };
        if !["auto", "v5r1", "v4r2", "v3r2"].contains(&version) {
            return Err(Error::new(ErrorKind::Validation, "Invalid Wallet-Version"));
        }
        headers.insert("Mnemonic".into(), self.credentials.mnemonic.clone());
        headers.insert("Wallet-Version".into(), version.into());
        for (key, value) in [
            ("Wallet-Address", &self.credentials.wallet_address),
            ("Api-Key", &self.credentials.provider_key),
        ] {
            if !value.is_empty() {
                headers.insert(key.into(), value.clone());
            }
        }
        if purchase {
            headers.insert("Cookie".into(), self.credentials.cookie.clone());
            for (key, value) in [
                ("Proxy", &self.credentials.proxy),
                ("User-Agent", &self.credentials.user_agent),
            ] {
                if !value.is_empty() {
                    headers.insert(key.into(), value.clone());
                }
            }
        }
        if headers.values().any(|value| value.contains(['\r', '\n'])) {
            return Err(Error::new(ErrorKind::Validation, "Invalid header value"));
        }
        Ok(headers)
    }

    fn request<T: DeserializeOwned>(
        &self,
        method: &'static str,
        path: &str,
        query: Option<BTreeMap<String, String>>,
        form: Option<BTreeMap<String, String>>,
        wallet: bool,
        purchase: bool,
    ) -> Result<T, Error> {
        let mut url = self.base.clone();
        url.set_path(&format!(
            "{}{}",
            self.base.path().trim_end_matches('/'),
            path
        ));
        if let Some(query) = query {
            url.query_pairs_mut().extend_pairs(query.iter());
        }
        let request = TransportRequest {
            method,
            url: url.into(),
            headers: self.headers(wallet, purchase)?,
            form,
        };
        let retries = if purchase { 0 } else { self.read_retries };
        for attempt in 0..=retries {
            let data = match self.transport.send(&request) {
                Ok(response) => self.parse(response, purchase),
                Err(TransportError::Timeout) => Err(Error::new(
                    ErrorKind::Timeout,
                    "Transport timed out; sensitive details omitted",
                )),
                Err(TransportError::Network) => Err(Error::new(
                    ErrorKind::Network,
                    "Transport failed; sensitive details omitted",
                )),
            };
            match data {
                Ok(data) => {
                    let details = self.safe_details(data.as_object());
                    return serde_json::from_value(data).map_err(|_| {
                        let mut error = Error::new(
                            ErrorKind::MalformedResponse,
                            "Unexpected response field type",
                        );
                        error.outcome_unknown = purchase;
                        error.details = details;
                        error
                    });
                }
                Err(mut error) => {
                    if purchase
                        && (matches!(
                            error.kind,
                            ErrorKind::Network | ErrorKind::Timeout | ErrorKind::MalformedResponse
                        ) || (error.status.is_some_and(|status| status >= 500)
                            && error.code.as_deref() != Some("RATE_LIMIT_UNAVAILABLE"))
                            || error
                                .status
                                .is_some_and(|status| (300..400).contains(&status)))
                    {
                        error.outcome_unknown = true;
                    }
                    if attempt < retries {
                        if let Some(wait) = self.retry_delay(&error, attempt) {
                            (self.sleeper)(wait);
                            continue;
                        }
                    }
                    return Err(error);
                }
            }
        }
        unreachable!("retry loop always returns")
    }

    fn parse(&self, response: TransportResponse, purchase: bool) -> Result<Value, Error> {
        if response.body.len() > 4 * 1024 * 1024 {
            return Err(Error::new(
                ErrorKind::MalformedResponse,
                "Response too large",
            ));
        }
        let data = serde_json::from_str::<Value>(&response.body).ok();
        let object = data.as_ref().and_then(Value::as_object);
        let retry_after = parse_retry_after(&response.headers, object, (self.clock)());
        if purchase
            && object
                .and_then(|object| object.get("unconfirmed"))
                .and_then(Value::as_bool)
                == Some(true)
        {
            let message = object
                .and_then(|object| {
                    ["error", "reason", "info", "message"]
                        .iter()
                        .find_map(|key| object.get(*key).and_then(Value::as_str))
                })
                .unwrap_or("Purchase outcome unknown; reconcile manually and do not retry");
            return Err(Error {
                kind: ErrorKind::PurchaseOutcomeUnknown,
                status: Some(response.status),
                code: object
                    .and_then(|object| object.get("error_code"))
                    .and_then(Value::as_str)
                    .map(|code| self.redact(code)),
                retry_after,
                message: self.redact(message),
                outcome_unknown: true,
                details: self.safe_details(object),
            });
        }
        if !(200..300).contains(&response.status) {
            let kind = match response.status {
                429 => ErrorKind::RateLimit,
                503 => ErrorKind::Unavailable,
                _ => ErrorKind::Api,
            };
            let message = object
                .and_then(|object| {
                    ["error", "reason", "info", "message"]
                        .iter()
                        .find_map(|key| object.get(*key).and_then(Value::as_str))
                })
                .unwrap_or("HTTP request failed");
            let code = object
                .and_then(|object| object.get("error_code"))
                .and_then(Value::as_str)
                .map(|code| self.redact(code));
            return Err(Error {
                kind,
                status: Some(response.status),
                code,
                retry_after,
                message: self.redact(message),
                outcome_unknown: false,
                details: self.safe_details(object),
            });
        }
        match object
            .and_then(|object| object.get("ok"))
            .and_then(Value::as_bool)
        {
            Some(true) => Ok(data.expect("object was checked")),
            Some(false) => {
                let message = object
                    .and_then(|object| {
                        ["error", "reason", "info"]
                            .iter()
                            .find_map(|key| object.get(*key).and_then(Value::as_str))
                    })
                    .unwrap_or("API reported failure");
                Err(Error {
                    kind: ErrorKind::Api,
                    status: Some(response.status),
                    code: None,
                    retry_after,
                    message: self.redact(message),
                    outcome_unknown: false,
                    details: self.safe_details(object),
                })
            }
            None => Err(Error::new(
                ErrorKind::MalformedResponse,
                "Expected JSON object with boolean ok",
            )),
        }
    }

    fn retry_delay(&self, error: &Error, attempt: u8) -> Option<Duration> {
        let mut delay = Duration::from_secs(1 << attempt);
        if matches!(error.kind, ErrorKind::RateLimit | ErrorKind::Unavailable) {
            if !self.automatic_wait {
                return None;
            }
            delay = error.retry_after.unwrap_or(delay);
        } else if !matches!(error.kind, ErrorKind::Network | ErrorKind::Timeout)
            && !error
                .status
                .is_some_and(|status| (500..600).contains(&status))
        {
            return None;
        }
        (delay <= self.max_wait).then_some(delay)
    }

    fn redact(&self, message: &str) -> String {
        let mut secrets = vec![
            self.credentials.mnemonic.clone(),
            self.credentials
                .mnemonic
                .split_whitespace()
                .collect::<Vec<_>>()
                .join(" "),
            self.credentials.cookie.clone(),
            self.credentials.provider_key.clone(),
            self.credentials.proxy.clone(),
        ];
        if let Ok(proxy) = Url::parse(&self.credentials.proxy) {
            secrets.push(
                percent_decode_str(proxy.username())
                    .decode_utf8_lossy()
                    .into_owned(),
            );
            if let Some(password) = proxy.password() {
                secrets.push(
                    percent_decode_str(password)
                        .decode_utf8_lossy()
                        .into_owned(),
                );
            }
        }
        for part in self.credentials.cookie.split(';') {
            if let Some((_, value)) = part.trim().split_once('=') {
                secrets.push(value.to_owned());
                secrets.push(value.trim_matches('"').to_owned());
            }
        }
        secrets
            .into_iter()
            .filter(|value| !value.is_empty())
            .flat_map(|secret| {
                let decoded = percent_decode_str(&secret).decode_utf8_lossy().into_owned();
                let encoded = utf8_percent_encode(&secret, NON_ALPHANUMERIC).to_string();
                [secret, decoded, encoded]
            })
            .fold(message.to_owned(), |message, secret| {
                message.replace(&secret, "[REDACTED]")
            })
    }

    fn safe_details(&self, object: Option<&Map<String, Value>>) -> Map<String, Value> {
        object
            .map(|object| {
                object
                    .iter()
                    .map(|(key, value)| {
                        let normalized = key.replace(['-', '_'], "").to_ascii_lowercase();
                        let sensitive = matches!(
                            normalized.as_str(),
                            "mnemonic"
                                | "seed"
                                | "cookie"
                                | "session"
                                | "stringsession"
                                | "password"
                                | "proxypassword"
                                | "proxy"
                                | "apikey"
                                | "providerkey"
                                | "authorization"
                                | "token"
                        );
                        let value = if sensitive {
                            Value::String("[REDACTED]".into())
                        } else {
                            self.safe_value(value.clone())
                        };
                        (key.clone(), value)
                    })
                    .collect()
            })
            .unwrap_or_default()
    }

    fn safe_value(&self, value: Value) -> Value {
        match value {
            Value::String(value) => Value::String(self.redact(&value)),
            Value::Object(object) => Value::Object(self.safe_details(Some(&object))),
            Value::Array(array) => Value::Array(
                array
                    .into_iter()
                    .map(|value| self.safe_value(value))
                    .collect(),
            ),
            value => value,
        }
    }
}

fn validate_username(username: &str) -> Result<(), Error> {
    let username = username.strip_prefix('@').unwrap_or(username);
    let bytes = username.as_bytes();
    if !(4..=32).contains(&bytes.len())
        || !bytes[0].is_ascii_alphabetic()
        || !bytes
            .iter()
            .all(|byte| byte.is_ascii_alphanumeric() || *byte == b'_')
    {
        return Err(Error::new(ErrorKind::Validation, "Invalid username"));
    }
    Ok(())
}

fn parse_retry_after(
    headers: &BTreeMap<String, String>,
    object: Option<&Map<String, Value>>,
    now: SystemTime,
) -> Option<Duration> {
    let valid_seconds = |seconds: f64| -> Option<Duration> {
        (seconds.is_finite() && (0.0..=31_536_000.0).contains(&seconds))
            .then(|| Duration::from_secs_f64(seconds))
    };
    let mut hints = Vec::new();
    if let Some(header) = headers
        .iter()
        .find(|(key, _)| key.eq_ignore_ascii_case("Retry-After"))
        .map(|(_, value)| value)
    {
        if let Ok(seconds) = header.trim().parse::<f64>() {
            if let Some(wait) = valid_seconds(seconds) {
                hints.push(wait);
            }
        } else if let Ok(date) = httpdate::parse_http_date(header) {
            hints.push(date.duration_since(now).unwrap_or(Duration::ZERO));
        }
    }
    if let Some(object) = object {
        for key in ["retry_after", "flood_wait"] {
            if let Some(value) = object.get(key) {
                let seconds = value
                    .as_f64()
                    .or_else(|| value.as_str().and_then(|value| value.parse::<f64>().ok()));
                if let Some(wait) = seconds.and_then(valid_seconds) {
                    hints.push(wait);
                }
            }
        }
    }
    hints.into_iter().max()
}
