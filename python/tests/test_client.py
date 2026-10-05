import json
import os
import runpy
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from urllib.parse import parse_qs, urlsplit

from fragment_donor_sdk import (
    ApiError,
    FloodWaitError,
    FragmentDonorClient,
    MalformedResponseError,
    PurchaseOutcomeUnknownError,
    ServiceUnavailableError,
    TransportError,
    TransportResponse,
    ValidationError,
    WalletCredentials,
)
from fragment_donor_sdk.client import _urllib_transport

FIXTURE = json.loads(
    (Path(__file__).resolve().parents[2] / "contract" / "fixtures.json").read_text(
        encoding="utf-8"
    )
)


def credentials(**overrides):
    values = {
        "mnemonic": FIXTURE["credentials"]["mnemonic"],
        "cookie": FIXTURE["credentials"]["cookie"],
        "provider_key": FIXTURE["credentials"]["provider_key"],
        "wallet_version": "v5r1",
        "wallet_address": "SYNTHETIC_WALLET_ADDRESS",
        "proxy": "http://SYNTHETIC_PROXY",
        "user_agent": "SYNTHETIC_AGENT",
    }
    values.update(overrides)
    return WalletCredentials(**values)


def response(name="user_info", status=200, headers=None, data=None):
    return TransportResponse(
        status,
        headers or {},
        json.dumps(data if data is not None else FIXTURE["responses"][name]).encode(),
    )


class FakeTransport:
    def __init__(self, *responses):
        self.responses = list(responses)
        self.requests = []

    def __call__(self, request):
        self.requests.append(request)
        item = self.responses.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


class ClientTests(unittest.TestCase):
    def test_unconfirmed_purchase_is_not_validation_and_never_retries(self):
        body = FIXTURE["responses"].get(
            "purchase_unconfirmed",
            {
                "ok": False,
                "unconfirmed": True,
                "tx_hash": "SYNTHETIC_UNCONFIRMED_TX_HASH",
                "info": "SYNTHETIC_TRANSFER_CONFIRMATION_UNKNOWN",
            },
        )
        for method in ("buy_stars", "buy_premium"):
            transport = FakeTransport(
                response(status=400, data=body), response("purchase")
            )
            client = FragmentDonorClient(
                credentials=credentials(),
                transport=transport,
                readonly_retries=2,
                auto_wait=True,
                sleep=lambda _: self.fail("unconfirmed purchase waited"),
            )
            with (
                self.subTest(method=method),
                self.assertRaises(PurchaseOutcomeUnknownError) as caught,
            ):
                getattr(client, method)("durov", 50 if method == "buy_stars" else 3)
            error = caught.exception
            self.assertNotIsInstance(error, ValidationError)
            self.assertTrue(error.purchase_outcome_unknown)
            self.assertEqual(error.status, 400)
            self.assertEqual(error.body["tx_hash"], body["tx_hash"])
            self.assertEqual(str(error), body["info"])
            self.assertEqual(len(transport.requests), 1)

    def test_timeout_phase_options_reach_injected_transport(self):
        transport = FakeTransport(response())
        FragmentDonorClient(
            transport=transport,
            timeout=9,
            connect_timeout=2,
            socket_timeout=3,
        ).get_user_info("durov")
        request = transport.requests[0]
        self.assertEqual(
            (request.timeout, request.connect_timeout, request.socket_timeout),
            (9, 2, 3),
        )
        for options in (
            {"connect_timeout": 0},
            {"socket_timeout": float("inf")},
            {"connect_timeout": True},
        ):
            with self.subTest(options=options), self.assertRaises(ValidationError):
                FragmentDonorClient(**options)

    def test_stdlib_deadline_bounds_connection_and_each_body_chunk(self):
        response_object = MagicMock(
            spec=["fp", "read", "read1", "code", "headers", "__enter__", "__exit__"]
        )
        socket = MagicMock()
        response_object.fp = SimpleNamespace(raw=SimpleNamespace(_sock=socket))
        response_object.read1.side_effect = [
            b'{"ok":true,"username":"durov",',
            b'"is_premium":false}',
            b"",
        ]
        response_object.code = 200
        response_object.headers = {}
        response_object.__enter__.return_value = response_object
        opener = MagicMock()
        opener.open.return_value = response_object
        transport = FakeTransport(response())
        client = FragmentDonorClient(
            transport=transport, timeout=5, connect_timeout=2, socket_timeout=3
        )
        client.get_user_info("durov")
        with (
            patch("fragment_donor_sdk.client.build_opener", return_value=opener),
            patch(
                "fragment_donor_sdk.client.time.monotonic",
                side_effect=[0, 0, 0, 1, 1, 4, 4, 4],
            ),
        ):
            result = _urllib_transport(transport.requests[0])
        self.assertEqual(opener.open.call_args.kwargs["timeout"], 2)
        self.assertEqual(
            [call.args[0] for call in socket.settimeout.call_args_list], [3, 3, 1]
        )
        self.assertEqual(json.loads(result.body)["username"], "durov")

    def test_stdlib_total_deadline_expires_between_progressing_chunks(self):
        response_object = MagicMock()
        response_object.__enter__.return_value = response_object
        response_object.read1.return_value = b"still progressing"
        opener = MagicMock()
        opener.open.return_value = response_object
        transport = FakeTransport(response())
        FragmentDonorClient(transport=transport, timeout=5).get_user_info("durov")
        with (
            patch("fragment_donor_sdk.client.build_opener", return_value=opener),
            patch("fragment_donor_sdk.client.time.monotonic", side_effect=[0, 0, 0, 6]),
            self.assertRaises(TimeoutError),
        ):
            _urllib_transport(transport.requests[0])
        self.assertEqual(response_object.read1.call_count, 1)
        response_object.__exit__.assert_called_once()

    def test_503_http_date_wait_hint(self):
        with self.assertRaises(ServiceUnavailableError) as caught:
            FragmentDonorClient(
                transport=FakeTransport(
                    response(
                        status=503,
                        headers={"Retry-After": "Thu, 01 Jan 1970 00:01:10 GMT"},
                        data={"ok": False},
                    )
                ),
                clock=lambda: 40,
            ).get_user_info("durov")
        self.assertEqual(caught.exception.retry_after, 30)

    def test_example_spending_requires_one_explicit_kind(self):
        example = Path(__file__).resolve().parents[1] / "examples" / "all_endpoints.py"
        for kind in (None, "invalid", "stars", "premium"):
            with self.subTest(kind=kind):
                environment = {
                    "FRAGMENT_ALLOW_PURCHASES": "yes",
                    "FRAGMENT_MNEMONIC": FIXTURE["credentials"]["mnemonic"],
                    "FRAGMENT_COOKIE": FIXTURE["credentials"]["cookie"],
                }
                if kind is not None:
                    environment["FRAGMENT_PURCHASE_KIND"] = kind
                fake = MagicMock()
                with (
                    patch.dict(os.environ, environment, clear=True),
                    patch(
                        "fragment_donor_sdk.FragmentDonorClient", return_value=fake
                    ) as factory,
                    patch("builtins.print"),
                ):
                    if kind not in {"stars", "premium"}:
                        with self.assertRaises(SystemExit):
                            runpy.run_path(str(example), run_name="__main__")
                        factory.assert_not_called()
                    else:
                        runpy.run_path(str(example), run_name="__main__")
                        self.assertEqual(
                            fake.buy_stars.call_count, int(kind == "stars")
                        )
                        self.assertEqual(
                            fake.buy_premium.call_count, int(kind == "premium")
                        )

    def test_username_get_has_no_auth_or_wallet_headers(self):
        transport = FakeTransport(response())
        result = FragmentDonorClient(
            credentials=credentials(), transport=transport
        ).get_user_info("@durov")
        req = transport.requests[0]
        self.assertEqual(req.method, "GET")
        self.assertEqual(
            urlsplit(req.url).path, FIXTURE["operations"]["get_user_info"]["path"]
        )
        self.assertEqual(parse_qs(urlsplit(req.url).query), {"username": ["@durov"]})
        for key in ("Authorization", "X-Api-Key", "Mnemonic", "Cookie", "Api-Key"):
            self.assertNotIn(key, req.headers)
        self.assertEqual(result.username, "durov")
        self.assertFalse(result.is_premium)
        self.assertEqual(result["future_field"], {"kept": True})

    def test_stars_form_and_sensitive_header_mapping(self):
        transport = FakeTransport(response("purchase"))
        result = FragmentDonorClient(
            credentials=credentials(), transport=transport
        ).buy_stars("@durov", 50, payment_method="ton")
        req = transport.requests[0]
        self.assertEqual(
            (req.method, urlsplit(req.url).path),
            ("POST", FIXTURE["operations"]["buy_stars"]["path"]),
        )
        self.assertEqual(
            parse_qs(req.body.decode()),
            {"username": ["@durov"], "amount": ["50"], "payment_method": ["ton"]},
        )
        self.assertEqual(
            req.headers["Content-Type"], "application/x-www-form-urlencoded"
        )
        for field, header in (
            ("mnemonic", "Mnemonic"),
            ("cookie", "Cookie"),
            ("provider_key", "Api-Key"),
        ):
            self.assertEqual(req.headers[header], FIXTURE["credentials"][field])
        self.assertEqual(req.headers["Wallet-Version"], "v5r1")
        self.assertEqual(req.headers["Proxy"], "http://SYNTHETIC_PROXY")
        self.assertEqual(req.headers["User-Agent"], "SYNTHETIC_AGENT")
        self.assertNotIn("Authorization", req.headers)
        self.assertNotIn("X-Api-Key", req.headers)
        self.assertEqual(result["future_field"], "preserve")

    def test_premium_form_default_payment(self):
        transport = FakeTransport(response("purchase"))
        FragmentDonorClient(transport=transport).buy_premium(
            "durov", 12, credentials=credentials()
        )
        req = transport.requests[0]
        self.assertEqual(
            urlsplit(req.url).path, FIXTURE["operations"]["buy_premium"]["path"]
        )
        self.assertEqual(
            parse_qs(req.body.decode()),
            {"username": ["durov"], "duration": ["12"], "payment_method": ["usdt_ton"]},
        )

    def test_balance_needs_no_cookie_and_preserves_decimal_precision(self):
        transport = FakeTransport(response("wallet_balance"))
        result = FragmentDonorClient(
            transport=transport, credentials=credentials(cookie=None)
        ).wallet_balance()
        req = transport.requests[0]
        self.assertEqual(
            (req.method, urlsplit(req.url).path),
            ("GET", FIXTURE["operations"]["wallet_balance"]["path"]),
        )
        self.assertNotIn("Cookie", req.headers)
        self.assertNotIn("Proxy", req.headers)
        self.assertEqual(result.usdt_ton, "9007199254740993.01")
        self.assertEqual(result.ton, "2.500000001")
        self.assertEqual(result.address, "SYNTHETIC_WALLET_ADDRESS")
        self.assertEqual(result["future_field"], "preserve")

    def test_invalid_arguments_never_send_http(self):
        transport = FakeTransport()
        client = FragmentDonorClient(transport=transport, credentials=credentials())
        actions = [
            lambda: client.get_user_info("bad"),
            lambda: client.buy_stars("durov", 49),
            lambda: client.buy_stars("durov", 1_000_001),
            lambda: client.buy_stars("durov", True),
            lambda: client.buy_premium("durov", 4),
            lambda: client.buy_stars("durov", 50, payment_method="btc"),
            lambda: client.buy_stars("durov", 50, credentials=credentials(cookie=None)),
        ]
        for action in actions:
            with self.subTest(action=action), self.assertRaises(ValidationError):
                action()
        self.assertEqual(transport.requests, [])

    def test_invalid_credentials_and_configuration(self):
        for value in ("one word", "\n" + FIXTURE["credentials"]["mnemonic"]):
            with self.assertRaises(ValidationError):
                credentials(mnemonic=value)
        for options in (
            {"readonly_retries": 3},
            {"timeout": 0},
            {"timeout": float("inf")},
            {"max_wait_seconds": 61},
            {"base_url": "http://remote.invalid"},
            {"base_url": "https://SYNTHETIC_USER:SYNTHETIC_PASSWORD@example.invalid"},
        ):
            with self.subTest(options=options), self.assertRaises(ValidationError):
                FragmentDonorClient(**options)
        with self.assertRaises(ValidationError):
            FragmentDonorClient().wallet_balance()

    def test_validation_and_reason_errors_are_structured(self):
        for name, expected in (
            ("validation", "Invalid amount"),
            ("upstream_error", "Not a user"),
        ):
            with self.subTest(name=name):
                client = FragmentDonorClient(
                    transport=FakeTransport(response(name, 400))
                )
                with self.assertRaises(ValidationError) as caught:
                    client.get_user_info("durov")
                self.assertEqual(caught.exception.status, 400)
                self.assertEqual(str(caught.exception), expected)

    def test_flood_wait_uses_largest_header_or_json_hint(self):
        transport = FakeTransport(response("flood_wait", 429, {"Retry-After": "30"}))
        with self.assertRaises(FloodWaitError) as caught:
            FragmentDonorClient(transport=transport).get_user_info("durov")
        self.assertEqual(caught.exception.retry_after, 42)
        self.assertEqual(caught.exception.error_code, "FLOOD_WAIT")

    def test_retry_after_http_date(self):
        transport = FakeTransport(
            response(
                status=429,
                headers={"Retry-After": "Thu, 01 Jan 1970 00:01:10 GMT"},
                data={"ok": False},
            )
        )
        with self.assertRaises(FloodWaitError) as caught:
            FragmentDonorClient(transport=transport, clock=lambda: 40).get_user_info(
                "durov"
            )
        self.assertEqual(caught.exception.retry_after, 30)

    def test_503_retry_hint(self):
        with self.assertRaises(ServiceUnavailableError) as caught:
            FragmentDonorClient(
                transport=FakeTransport(response("unavailable", 503))
            ).get_user_info("durov")
        self.assertEqual(caught.exception.retry_after, 5)

    def test_default_and_no_autowait_never_retry(self):
        for options in ({}, {"readonly_retries": 2}):
            transport = FakeTransport(response("flood_wait", 429), response())
            with self.subTest(options=options), self.assertRaises(FloodWaitError):
                FragmentDonorClient(transport=transport, **options).get_user_info(
                    "durov"
                )
            self.assertEqual(len(transport.requests), 1)

    def test_readonly_retry_is_optin_bounded_and_honors_wait(self):
        transport = FakeTransport(
            response("flood_wait", 429), response("unavailable", 503), response()
        )
        waits = []
        client = FragmentDonorClient(
            transport=transport, readonly_retries=2, auto_wait=True, sleep=waits.append
        )
        self.assertTrue(client.get_user_info("durov").ok)
        self.assertEqual(len(transport.requests), 3)
        self.assertEqual(waits, [42, 5])

    def test_wait_over_max_is_not_clamped_into_an_early_retry(self):
        transport = FakeTransport(response("flood_wait", 429))
        with self.assertRaises(FloodWaitError):
            FragmentDonorClient(
                transport=transport,
                readonly_retries=2,
                auto_wait=True,
                max_wait_seconds=10,
            ).get_user_info("durov")
        self.assertEqual(len(transport.requests), 1)

    def test_network_retry_is_bounded(self):
        transport = FakeTransport(
            OSError("network"), OSError("network"), OSError("network")
        )
        waits = []
        with self.assertRaises(TransportError):
            FragmentDonorClient(
                transport=transport,
                readonly_retries=2,
                auto_wait=True,
                sleep=waits.append,
            ).get_user_info("durov")
        self.assertEqual(len(transport.requests), 3)
        self.assertEqual(waits, [1, 2])

    def test_purchases_never_retry_any_failure(self):
        cases = [
            TimeoutError("SYNTHETIC_TIMEOUT"),
            OSError("reset"),
            response("flood_wait", 429),
            response("unavailable", 503),
            response(status=500, data={"ok": False}),
            TransportResponse(200, {}, b"not-json"),
        ]
        for call in ("buy_stars", "buy_premium"):
            for item in cases:
                transport = FakeTransport(item, response("purchase"))
                client = FragmentDonorClient(
                    transport=transport,
                    credentials=credentials(),
                    readonly_retries=2,
                    auto_wait=True,
                    sleep=lambda _: self.fail("purchase slept"),
                )
                with self.subTest(call=call, item=item), self.assertRaises(ApiError):
                    getattr(client, call)("durov", 50 if call == "buy_stars" else 3)
                self.assertEqual(len(transport.requests), 1)

    def test_invalid_json_and_schema_are_safe(self):
        for data in (
            b"oops",
            b"[]",
            b'{"ok":true}',
            b'{"ok":"true"}',
            b"x" * 1_048_577,
        ):
            with (
                self.subTest(size=len(data)),
                self.assertRaises(MalformedResponseError),
            ):
                FragmentDonorClient(
                    transport=FakeTransport(TransportResponse(200, {}, data))
                ).get_user_info("durov")
        with self.assertRaises(MalformedResponseError):
            FragmentDonorClient(
                credentials=credentials(),
                transport=FakeTransport(
                    response(
                        data={"ok": True, "address": "x", "ton": 0.1, "usdt_ton": "1"}
                    )
                ),
            ).wallet_balance()

    def test_credential_repr_and_echo_errors_redact(self):
        creds = credentials()
        body = {
            "ok": False,
            "error": "Rejected " + creds.mnemonic,
            "cookie": creds.cookie,
            "nested": {"Api-Key": creds.provider_key, "text": creds.cookie},
        }
        transport = FakeTransport(response(status=400, data=body))
        client = FragmentDonorClient(credentials=creds, transport=transport)
        with self.assertRaises(ApiError) as caught:
            client.buy_stars("durov", 50)
        displays = [
            repr(creds),
            repr(client),
            repr(transport.requests[0]),
            str(caught.exception),
            repr(caught.exception),
            repr(caught.exception.body),
        ]
        for value in FIXTURE["credentials"].values():
            self.assertTrue(all(value not in display for display in displays))
        self.assertEqual(caught.exception.body["cookie"], "[REDACTED]")

    def test_original_transport_error_not_exposed(self):
        secret = FIXTURE["credentials"]["mnemonic"]
        transport = FakeTransport(OSError("request headers: " + secret))
        with self.assertRaises(TransportError) as caught:
            FragmentDonorClient(
                credentials=credentials(), transport=transport
            ).buy_stars("durov", 50)
        self.assertNotIn(secret, str(caught.exception))
        self.assertTrue(caught.exception.purchase_outcome_unknown)
        self.assertTrue(caught.exception.__suppress_context__)

    def test_partial_cookie_proxy_and_normalized_mnemonic_echoes_redact(self):
        normalized = FIXTURE["credentials"]["mnemonic"]
        creds = credentials(
            mnemonic="  " + "  ".join(normalized.split()) + "  ",
            cookie="stel_ssid=SYNTHETIC_SESSION_TOKEN; stel_token=SYNTHETIC%40COOKIE_TOKEN",
            proxy="http://SYNTHETIC_PROXY_USER:SYNTHETIC%40PROXY_PASSWORD@proxy.invalid:8080",
        )
        partials = [
            "SYNTHETIC_SESSION_TOKEN",
            "SYNTHETIC%40COOKIE_TOKEN",
            "SYNTHETIC@COOKIE_TOKEN",
            "SYNTHETIC_PROXY_USER",
            "SYNTHETIC%40PROXY_PASSWORD",
            "SYNTHETIC@PROXY_PASSWORD",
            normalized,
        ]
        for status in (200, 400):
            body = {
                "ok": status == 200,
                "username": "durov",
                "is_premium": False,
                "future_normal": "keep",
                "echoes": partials,
                "error": " | ".join(partials),
            }
            client = FragmentDonorClient(
                credentials=creds,
                transport=FakeTransport(response(status=status, data=body)),
            )
            if status == 200:
                result = client.get_user_info("durov")
                self.assertEqual(result["future_normal"], "keep")
                displays = [repr(result), repr(result.raw)]
                self.assertEqual(result["echoes"], ["[REDACTED]"] * len(partials))
            else:
                with self.assertRaises(ApiError) as caught:
                    client.get_user_info("durov")
                displays = [
                    str(caught.exception),
                    repr(caught.exception),
                    repr(caught.exception.body),
                ]
            for partial in partials:
                self.assertTrue(all(partial not in display for display in displays))

    def test_default_transport_disables_redirects(self):
        visits = []

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                visits.append(self.path)
                self.send_response(302)
                self.send_header("Location", "/leaked")
                self.end_headers()

            def log_message(self, *args):
                pass

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            client = FragmentDonorClient(
                base_url=f"http://127.0.0.1:{server.server_port}",
                credentials=credentials(),
            )
            with self.assertRaises(ApiError):
                client.wallet_balance()
            self.assertEqual(visits, ["/wallet-balance/"])
        finally:
            server.shutdown()
            server.server_close()
            thread.join()


if __name__ == "__main__":
    unittest.main()
