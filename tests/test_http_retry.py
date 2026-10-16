from io import BytesIO
from unittest.mock import Mock
from urllib.error import HTTPError, URLError

import pytest

from scripts import scrape_political_intel as legacy


@pytest.fixture
def http(monkeypatch):
    opener = Mock(side_effect=AssertionError("unexpected HTTP request"))
    sleep = Mock()
    monkeypatch.setattr(legacy.urllib.request, "urlopen", opener)
    monkeypatch.setattr(legacy.time, "sleep", sleep)
    monkeypatch.setattr(legacy.random, "uniform", lambda low, high: 1)
    return opener, sleep


def error(code, headers=None):
    return HTTPError("https://example.test", code, "blocked", headers or {}, None)


def test_http_retries_503_then_succeeds(http):
    opener, sleep = http
    opener.side_effect = [error(503), BytesIO(b"success")]

    assert legacy.http_get("https://example.test") == b"success"
    assert opener.call_count == 2
    sleep.assert_called_once_with(1)


@pytest.mark.parametrize("failure", [error(503), error(429), URLError("offline"), TimeoutError("timed out")])
def test_http_gives_up_after_configured_attempts(http, failure):
    opener, sleep = http
    opener.side_effect = failure

    with pytest.raises(type(failure)):
        legacy.http_get("https://example.test", attempts=4)

    assert opener.call_count == 4
    assert [call.args[0] for call in sleep.call_args_list] == [1, 2, 4]


@pytest.mark.parametrize("code", [400, 401, 403, 404])
def test_http_does_not_retry_other_client_errors(http, code):
    opener, sleep = http
    opener.side_effect = error(code)

    with pytest.raises(HTTPError):
        legacy.http_get("https://example.test")

    assert opener.call_count == 1
    sleep.assert_not_called()


@pytest.mark.parametrize("code", [429, 503])
@pytest.mark.parametrize(("retry_after", "delay"), [("7", 7), ("100", 30), ("0", 0), ("invalid", 1), ("-2", 1)])
def test_http_retry_after(http, code, retry_after, delay):
    opener, sleep = http
    opener.side_effect = [error(code, {"Retry-After": retry_after}), BytesIO(b"ok")]

    assert legacy.http_get("https://example.test") == b"ok"
    sleep.assert_called_once_with(delay)


@pytest.mark.parametrize(("headers", "expected_ua"), [
    (None, legacy.USER_AGENTS[0]),
    ({"user-agent": "ExplicitAgent"}, "ExplicitAgent"),
])
def test_http_preserves_headers_timeout_and_default_user_agent(http, monkeypatch, headers, expected_ua):
    opener, _ = http
    opener.side_effect = [BytesIO(b"ok")]
    monkeypatch.setattr(legacy.random, "choice", lambda choices: choices[0])

    legacy.http_get("https://example.test", headers=headers, timeout=9)

    request = opener.call_args.args[0]
    assert request.get_header("User-agent") == expected_ua
    assert opener.call_args.kwargs["timeout"] == 9


def test_load_json_url_uses_retry_helper(http):
    opener, _ = http
    opener.side_effect = [error(503), BytesIO(b'{"posts": []}')]

    assert legacy.load_json_url("https://example.test", timeout=20) == {"posts": []}
    assert opener.call_args.args[0].get_header("Accept") == "application/json"
    assert opener.call_args.kwargs["timeout"] == 20
