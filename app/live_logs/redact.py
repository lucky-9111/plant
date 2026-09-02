"""Redacts secrets out of log messages before they ever reach the ring
buffer or a WebSocket client -- applied unconditionally in the logging
handler, not something a call site can opt out of."""
import re

_PATTERNS = [
    # key=value / key: value style (password, token, secret, api key, ...).
    # No leading \b: env-var-style names like DB_PASSWORD or SECRET_KEY have
    # an underscore right before the keyword, which \b would refuse to
    # cross (underscore counts as a "word" character) -- and for a
    # redaction filter, over-matching is the safe failure direction.
    # Trailing [a-z_]* absorbs compound env-var suffixes (SECRET_KEY=,
    # DB_PASSWORD_HASH=, API_TOKEN_ID=) so the keyword doesn't have to be
    # immediately followed by the delimiter.
    re.compile(
        r"(?i)(password|passwd|pwd|secret|api[_-]?key|access[_-]?token|refresh[_-]?token|auth[_-]?token|token)[a-z_]*\s*[=:]\s*\S+"
    ),
    re.compile(r"(?i)\bBearer\s+[A-Za-z0-9\-_.]+"),
    re.compile(r"(?i)\bBasic\s+[A-Za-z0-9+/=]+"),
    re.compile(r"\brzp_(?:test|live)_[A-Za-z0-9]+"),  # Razorpay key id/secret shape (non-capturing -- the whole token is the secret, not a key=value pair)
]


def redact(text: str) -> str:
    if not text:
        return text
    for pattern in _PATTERNS:
        text = pattern.sub(_replace, text)
    return text


def _replace(match: "re.Match") -> str:
    # Keep the key name (if the pattern captured one) so the log stays
    # readable ("password=***REDACTED***") instead of vanishing entirely.
    if match.re.groups:
        key = match.group(1)
        return f"{key}=***REDACTED***"
    return "***REDACTED***"
