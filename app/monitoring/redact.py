"""Strips anything that looks like a secret from technical error details
BEFORE they're written to the database -- defense at the write layer, not
just the API response layer, so even a raw DB dump never has secrets in it.

Never displayed/stored: passwords, API keys, tokens, secrets, credentials.
"""

import re

_SECRET_LINE_PATTERN = re.compile(
    r"(?im)^(.*\b(password|passwd|token|secret|api[_-]?key|authorization|"
    r"session_secret|razorpay_key_secret|bank_details)\b\s*[:=].*)$"
)


def redact_technical_details(text: str | None) -> str | None:
    if not text:
        return text
    return _SECRET_LINE_PATTERN.sub(lambda m: _redact_line(m.group(1)), text)


def _redact_line(line: str) -> str:
    key, sep, _ = line.partition("=") if "=" in line else line.partition(":")
    if not sep:
        return "[REDACTED]"
    return f"{key}{sep} [REDACTED]"
