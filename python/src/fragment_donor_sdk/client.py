"""Dependency-free synchronous client with injectable HTTP transport."""

from __future__ import annotations

import json
import math
import re
import time
from collections.abc import Callable, Iterator, Mapping
from dataclasses import dataclass, field
from datetime import timezone
from email.message import Message
from email.utils import parsedate_to_datetime
from types import MappingProxyType
from typing import IO, Literal, TypedDict, TypeVar, cast
from urllib.error import HTTPError
from urllib.parse import unquote, urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener

WalletVersion = Literal["auto", "v5r1", "v4r2", "v3r2"]
PaymentMethod = Literal["usdt_ton", "ton"]
_USERNAME = re.compile(r"^@?[A-Za-z][A-Za-z0-9_]{3,31}$")
_SENSITIVE = re.compile(
    r"mnemonic|cookie|password|secret|token|api.?key|proxy|authorization", re.I
)
_RESPONSE_LIMIT = 1_048_576


def _safe(value: object, secrets: tuple[str, ...] = ()) -> object:
    if isinstance(value, str):
        for secret in sorted((s for s in secrets if s), key=len, reverse=True):
            value = value.replace(secret, "[REDACTED]")
        return value
    if isinstance(value, Mapping):
        return {
            str(k): "[REDACTED]" if _SENSITIVE.search(str(k)) else _safe(v, secrets)
            for k, v in value.items()
        }
    if isinstance(value, list):
        return [_safe(v, secrets) for v in value]
    return value


class ApiError(Exception):
    """Sanitized failure. Purchase failures can have an uncertain outcome."""

    def __init__(
        self,
        message: str,
        *,
        status: int | None = None,
        error_code: str | None = None,
        retry_after: float | None = None,
        body: Mapping[str, object] | None = None,
        purchase_outcome_unknown: bool = False,
    ) -> None:
        super().__init__(message)
        self.status = status
        self.error_code = error_code
        self.retry_after = retry_after
        self.body = MappingProxyType(dict(body or {}))
        self.purchase_outcome_unknown = purchase_outcome_unknown

    def __repr__(self) -> str:
        return (
            f"{type(self).__name__}(status={self.status!r}, "
            f"retry_after={self.retry_after!r})"
        )


class ValidationError(ApiError):
    """Local invalid argument or HTTP 400 validation/upstream rejection."""


class FloodWaitError(ApiError):
    """HTTP 429; inspect retry_after before a manual retry."""


class ServiceUnavailableError(ApiError):
    """HTTP 503; inspect retry_after."""


class TransportError(ApiError):
    """Timeout or network failure; original exception is deliberately hidden."""


class PurchaseOutcomeUnknownError(ApiError):
    """Backend reports an unconfirmed transfer; reconcile, never resend blindly."""


class MalformedResponseError(ApiError):
    """Invalid JSON, schema, or oversized response."""


class _ErrorArgs(TypedDict, total=False):
    status: int
    error_code: str
    retry_after: float | None
    body: Mapping[str, object]
    purchase_outcome_unknown: bool


@dataclass(frozen=True, repr=False)
class WalletCredentials:
    """Wallet headers. Never put these in browser code or telemetry."""

    mnemonic: str = field(repr=False)
    cookie: str | None = field(default=None, repr=False)
    wallet_version: WalletVersion = "auto"
    wallet_address: str | None = field(default=None, repr=False)
    provider_key: str | None = field(default=None, repr=False)
    proxy: str | None = field(default=None, repr=False)
    user_agent: str | None = field(default=None, repr=False)

    def __post_init__(self) -> None:
        for value in (
            self.mnemonic,
            self.cookie,
            self.wallet_address,
            self.provider_key,
            self.proxy,
            self.user_agent,
            self.wallet_version,
        ):
            if value is None:
                continue
            if not isinstance(value, str) or "\r" in value or "\n" in value:
                raise ValidationError(
                    "Credential headers must be strings without line breaks"
                )
        if len(self.mnemonic.split()) not in (12, 18, 24):
            raise ValidationError("Mnemonic must contain 12, 18, or 24 words")
        if self.wallet_version not in ("auto", "v5r1", "v4r2", "v3r2"):
            raise ValidationError("Unsupported wallet version")

    def __repr__(self) -> str:
        return "WalletCredentials([REDACTED])"

    def _secrets(self) -> tuple[str, ...]:
        values = [
            v for v in (self.mnemonic, self.cookie, self.provider_key, self.proxy) if v
        ]
        values.append(" ".join(self.mnemonic.split()))
        if self.cookie:
            for item in self.cookie.split(";"):
                if "=" in item:
                    token = item.split("=", 1)[1].strip().strip('"')
                    if token:
                        values.extend((token, unquote(token)))
        if self.proxy:
            try:
                parts = urlsplit(
                    self.proxy if "://" in self.proxy else "//" + self.proxy
                )
                for value in (parts.username, parts.password):
                    if value:
                        values.extend((value, unquote(value)))
            except ValueError:
                # Malformed proxy text is still redacted in full.
                pass
        return tuple(dict.fromkeys(values))

    def _headers(self, purchase: bool) -> dict[str, str]:
        if purchase and not (self.cookie or "").strip():
            raise ValidationError("Fragment cookie is required for purchases")
        headers = {
            "Mnemonic": " ".join(self.mnemonic.split()),
            "Wallet-Version": self.wallet_version,
        }
        # Balance never needs a Fragment cookie or proxy.
        optional = {"Wallet-Address": self.wallet_address, "Api-Key": self.provider_key}
        if purchase:
            optional.update(
                {
                    "Cookie": self.cookie,
                    "Proxy": self.proxy,
                    "User-Agent": self.user_agent,
                }
            )
        headers.update({k: v for k, v in optional.items() if v})
        return headers


@dataclass(frozen=True, repr=False)
class TransportRequest:
    method: str
    url: str
    headers: Mapping[str, str] = field(repr=False)
    body: bytes | None = field(default=None, repr=False)
    timeout: float = 30
    connect_timeout: float | None = None
    socket_timeout: float | None = None

    def __repr__(self) -> str:
        return f"TransportRequest(method={self.method!r}, headers=[REDACTED])"


@dataclass(frozen=True, repr=False)
class TransportResponse:
    status: int
    headers: Mapping[str, str]
    body: bytes = field(repr=False)

    def __repr__(self) -> str:
        return f"TransportResponse(status={self.status!r})"


class _NoRedirects(HTTPRedirectHandler):
    def redirect_request(
        self,
        req: Request,
        fp: IO[bytes],
        code: int,
        msg: str,
        headers: Message,
        newurl: str,
    ) -> None:
        return None


def _remaining_timeout(deadline: float, phase_timeout: float) -> float:
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise TimeoutError("Request deadline exceeded")
    return min(remaining, phase_timeout)


def _set_socket_timeout(response: object, timeout: float) -> None:
    """Best effort for urllib's HTTPResponse/HTTPError wrappers, not DNS."""
    current = response
    for _ in range(5):
        socket = getattr(current, "_sock", None)
        if socket is not None:
            socket.settimeout(timeout)
            return
        wrapped = getattr(current, "raw", None)
        if wrapped is None:
            wrapped = getattr(current, "fp", None)
        if wrapped is None:
            return
        current = wrapped


def _urllib_transport(request: TransportRequest) -> TransportResponse:
    # DNS resolution may exceed this best-effort deadline in stdlib urllib.
    # Socket phases are bounded and the remaining budget is checked per chunk.
    deadline = time.monotonic() + request.timeout
    opener = build_opener(_NoRedirects())
    req = Request(
        request.url,
        data=request.body,
        headers=dict(request.headers),
        method=request.method,
    )
    try:
        response = opener.open(
            req,
            timeout=_remaining_timeout(
                deadline, request.connect_timeout or request.timeout
            ),
        )
    except HTTPError as error:
        response = error
    with response:
        chunks: list[bytes] = []
        size = 0
        read = getattr(response, "read1", response.read)
        while size <= _RESPONSE_LIMIT:
            _set_socket_timeout(
                response,
                _remaining_timeout(deadline, request.socket_timeout or request.timeout),
            )
            chunk = read(min(65_536, _RESPONSE_LIMIT + 1 - size))
            _remaining_timeout(deadline, request.socket_timeout or request.timeout)
            if not chunk:
                break
            chunks.append(chunk)
            size += len(chunk)
        body = b"".join(chunks)
        return TransportResponse(response.code, dict(response.headers.items()), body)


class ApiResponse(Mapping[str, object]):
    """Immutable top-level mapping; all unknown fields are retained."""

    __slots__ = ("_data",)

    def __init__(self, data: Mapping[str, object]) -> None:
        self._data = MappingProxyType(dict(data))

    @property
    def ok(self) -> bool:
        return self._data["ok"] is True

    @property
    def raw(self) -> Mapping[str, object]:
        return self._data

    def __getitem__(self, key: str) -> object:
        return self._data[key]

    def __iter__(self) -> Iterator[str]:
        return iter(self._data)

    def __len__(self) -> int:
        return len(self._data)

    def __repr__(self) -> str:
        return f"{type(self).__name__}(ok={self.ok!r}, fields={len(self)})"


class UserInfoResponse(ApiResponse):
    @property
    def username(self) -> str:
        return str(self._data["username"])

    @property
    def is_premium(self) -> bool:
        return self._data["is_premium"] is True


class PurchaseResponse(ApiResponse):
    @property
    def data(self) -> object:
        return self._data.get("data")


class WalletBalanceResponse(ApiResponse):
    @property
    def address(self) -> str:
        return str(self._data["address"])

    @property
    def ton(self) -> str:
        return str(self._data["ton"])

    @property
    def usdt_ton(self) -> str:
        return str(self._data["usdt_ton"])


R = TypeVar("R", bound=ApiResponse)


class FragmentDonorClient:
    """Four API methods. Purchases NEVER retry, including 429 and 503."""

    def __init__(
        self,
        *,
        base_url: str = "https://fragment.donor.uz",
        credentials: WalletCredentials | None = None,
        timeout: float = 30,
        connect_timeout: float | None = None,
        socket_timeout: float | None = None,
        readonly_retries: int = 0,
        auto_wait: bool = False,
        max_wait_seconds: float = 60,
        transport: Callable[[TransportRequest], TransportResponse] | None = None,
        sleep: Callable[[float], None] = time.sleep,
        clock: Callable[[], float] = time.time,
    ) -> None:
        parts = urlsplit(base_url)
        local = parts.hostname in ("localhost", "127.0.0.1", "::1")
        if (parts.scheme != "https" and not (parts.scheme == "http" and local)) or (
            not parts.hostname
            or parts.username
            or parts.password
            or parts.query
            or parts.fragment
        ):
            raise ValidationError(
                "Base URL must be HTTPS, without credentials, query, or fragment"
            )
        if (
            not isinstance(timeout, (int, float))
            or not math.isfinite(timeout)
            or timeout <= 0
        ):
            raise ValidationError("Timeout must be positive and finite")
        for value in (connect_timeout, socket_timeout):
            if value is not None and (
                isinstance(value, bool)
                or not isinstance(value, (int, float))
                or not math.isfinite(value)
                or value <= 0
            ):
                raise ValidationError("Phase timeouts must be positive and finite")
        if type(readonly_retries) is not int or not 0 <= readonly_retries <= 2:
            raise ValidationError("readonly_retries must be an integer between 0 and 2")
        if (
            not isinstance(max_wait_seconds, (int, float))
            or not math.isfinite(max_wait_seconds)
            or not 0 <= max_wait_seconds <= 60
        ):
            raise ValidationError("max_wait_seconds must be between 0 and 60")
        self.base_url = base_url.rstrip("/")
        self._credentials = credentials
        self.timeout = timeout
        self.connect_timeout = connect_timeout
        self.socket_timeout = socket_timeout
        self.readonly_retries = readonly_retries
        self.auto_wait = auto_wait
        self.max_wait_seconds = max_wait_seconds
        self._transport = transport or _urllib_transport
        self._sleep = sleep
        self._clock = clock

    def __repr__(self) -> str:
        return "FragmentDonorClient(credentials=[REDACTED])"

    @staticmethod
    def _username(username: str) -> None:
        if not isinstance(username, str) or not _USERNAME.fullmatch(username):
            raise ValidationError("Invalid username")

    def get_user_info(self, username: str) -> UserInfoResponse:
        self._username(username)
        return self._request(
            "GET",
            "/get-user-info/?" + urlencode({"username": username}),
            UserInfoResponse,
        )

    def buy_stars(
        self,
        username: str,
        amount: int,
        *,
        payment_method: PaymentMethod = "usdt_ton",
        credentials: WalletCredentials | None = None,
    ) -> PurchaseResponse:
        self._username(username)
        if type(amount) is not int or not 50 <= amount <= 1_000_000:
            raise ValidationError("amount must be an integer between 50 and 1000000")
        return self._purchase(
            "/buy-stars/",
            {"username": username, "amount": amount, "payment_method": payment_method},
            credentials,
        )

    def buy_premium(
        self,
        username: str,
        duration: Literal[3, 6, 12],
        *,
        payment_method: PaymentMethod = "usdt_ton",
        credentials: WalletCredentials | None = None,
    ) -> PurchaseResponse:
        self._username(username)
        if type(duration) is not int or duration not in (3, 6, 12):
            raise ValidationError("duration must be 3, 6, or 12 months")
        return self._purchase(
            "/buy-premium/",
            {
                "username": username,
                "duration": duration,
                "payment_method": payment_method,
            },
            credentials,
        )

    def wallet_balance(
        self, *, credentials: WalletCredentials | None = None
    ) -> WalletBalanceResponse:
        creds = self._get_credentials(credentials)
        return self._request(
            "GET", "/wallet-balance/", WalletBalanceResponse, credentials=creds
        )

    def _get_credentials(self, override: WalletCredentials | None) -> WalletCredentials:
        credentials = override or self._credentials
        if not isinstance(credentials, WalletCredentials):
            raise ValidationError("WalletCredentials are required for this operation")
        return credentials

    def _purchase(
        self,
        path: str,
        form: Mapping[str, object],
        credentials: WalletCredentials | None,
    ) -> PurchaseResponse:
        if form["payment_method"] not in ("usdt_ton", "ton"):
            raise ValidationError("payment_method must be usdt_ton or ton")
        creds = self._get_credentials(credentials)
        return self._request(
            "POST", path, PurchaseResponse, form=form, credentials=creds, purchase=True
        )

    def _retry_after(
        self, headers: Mapping[str, str], body: Mapping[str, object]
    ) -> float | None:
        hints: list[float] = []
        value = next(
            (v for k, v in headers.items() if k.lower() == "retry-after"), None
        )
        if value is not None:
            try:
                hints.append(float(value))
            except (ValueError, TypeError):
                try:
                    date = parsedate_to_datetime(value)
                    if date.tzinfo is None:
                        date = date.replace(tzinfo=timezone.utc)
                    hints.append(max(0, date.timestamp() - self._clock()))
                except (ValueError, TypeError, OverflowError):
                    pass
        for key in ("retry_after", "flood_wait"):
            try:
                body_hint = body.get(key)
                if isinstance(body_hint, (int, float, str)) and not isinstance(
                    body_hint, bool
                ):
                    hints.append(float(body_hint))
            except (ValueError, TypeError):
                pass
        valid = [hint for hint in hints if math.isfinite(hint) and hint >= 0]
        return max(valid) if valid else None

    def _request(
        self,
        method: str,
        path: str,
        model: type[R],
        *,
        form: Mapping[str, object] | None = None,
        credentials: WalletCredentials | None = None,
        purchase: bool = False,
    ) -> R:
        headers = {
            "Accept": "application/json",
            "User-Agent": "fragment-donor-sdk-python/0.1.0",
        }
        secrets = self._credentials._secrets() if self._credentials else ()
        if credentials:
            headers.update(credentials._headers(purchase))
            secrets = (*credentials._secrets(), " ".join(credentials.mnemonic.split()))
        body = None
        if form is not None:
            headers["Content-Type"] = "application/x-www-form-urlencoded"
            body = urlencode(form).encode("utf-8")
        request = TransportRequest(
            method,
            self.base_url + path,
            MappingProxyType(headers),
            body,
            self.timeout,
            self.connect_timeout,
            self.socket_timeout,
        )
        retries = 0 if purchase else self.readonly_retries
        for attempt in range(retries + 1):
            error: ApiError
            try:
                response = self._transport(request)
            except Exception:
                error = TransportError(
                    "Request failed: network error or timeout",
                    purchase_outcome_unknown=purchase,
                )
            else:
                result = self._decode(response, model, secrets, purchase)
                if not isinstance(result, ApiError):
                    return result
                error = result
            transient = isinstance(
                error, (TransportError, FloodWaitError, ServiceUnavailableError)
            ) or (error.status is not None and error.status >= 500)
            wait = (
                error.retry_after
                if error.retry_after is not None
                else min(2**attempt, 4)
            )
            if (
                attempt < retries
                and transient
                and self.auto_wait
                and wait <= self.max_wait_seconds
            ):
                self._sleep(wait)
                continue
            raise error from None
        raise AssertionError("Unreachable")

    def _decode(
        self,
        response: TransportResponse,
        model: type[R],
        secrets: tuple[str, ...],
        purchase: bool,
    ) -> R | ApiError:
        data: dict[str, object] = {}
        malformed = False
        try:
            if len(response.body) > _RESPONSE_LIMIT:
                raise ValueError("oversized")
            parsed = json.loads(response.body)
            if not isinstance(parsed, dict):
                raise ValueError("not object")
            data = cast(dict[str, object], _safe(parsed, secrets))
        except (ValueError, TypeError, UnicodeError):
            malformed = True
        hint = self._retry_after(response.headers, data)
        common: _ErrorArgs = {
            "status": response.status,
            "retry_after": hint,
            "body": data,
            "purchase_outcome_unknown": purchase
            and (
                data.get("unconfirmed") is True
                or malformed
                or response.status >= 500
                or 300 <= response.status < 400
            ),
        }
        code = data.get("error_code")
        if isinstance(code, str):
            common["error_code"] = code
        if purchase and data.get("unconfirmed") is True:
            message = (
                data.get("info")
                or data.get("error")
                or "Purchase outcome is unconfirmed; reconcile before another purchase"
            )
            return PurchaseOutcomeUnknownError(str(message), **common)
        if response.status == 429:
            return FloodWaitError("Rate limit exceeded; inspect retry_after", **common)
        if response.status == 503:
            return ServiceUnavailableError("Service temporarily unavailable", **common)
        if malformed:
            return MalformedResponseError(
                "Response is not a valid JSON object", **common
            )
        if not 200 <= response.status < 300 or data.get("ok") is False:
            message = data.get("error") or data.get("reason") or "API request failed"
            error_type = ValidationError if response.status == 400 else ApiError
            return error_type(str(message), **common)
        if data.get("ok") is not True:
            return MalformedResponseError("Response is missing boolean ok", **common)
        if model is UserInfoResponse and (
            not isinstance(data.get("username"), str)
            or type(data.get("is_premium")) is not bool
        ):
            return MalformedResponseError("User response has invalid fields", **common)
        if model is WalletBalanceResponse and any(
            not isinstance(data.get(key), str) for key in ("address", "ton", "usdt_ton")
        ):
            return MalformedResponseError(
                "Wallet response must preserve decimal strings", **common
            )
        return model(data)
