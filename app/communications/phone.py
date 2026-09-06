"""One centralized Indian-mobile normalization utility, used by every
module (Orders, Accounting, Delivery, Website, bulk messaging) -- section 6.
"""
import re


def normalize_mobile(raw: str | None) -> str | None:
    """Return "+91XXXXXXXXXX" for a valid Indian mobile number, else None.
    Never raises -- callers treat None as "cannot message this contact"."""
    if not raw:
        return None

    digits = re.sub(r"[^\d]", "", raw)  # strip spaces, hyphens, +, parens, etc.
    if not digits:
        return None

    # Strip a leading 91 country code (with or without a leading 0 first).
    if digits.startswith("0"):
        digits = digits.lstrip("0")
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    elif len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]

    if len(digits) != 10 or digits[0] not in "6789":
        return None

    return f"+91{digits}"
