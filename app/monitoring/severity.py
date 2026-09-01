"""Rule-based severity classification. Based on actual module/status-code
impact (per the spec: "not randomly assigned"), not user-editable -- there is
deliberately no manual override UI for severity, only for `ErrorLog.status`.
"""

SEVERITIES = ("INFO", "WARNING", "MEDIUM", "HIGH", "CRITICAL")


def classify(module: str, sub_module: str | None, function_name: str, endpoint: str, status_code: int, exc: BaseException | None) -> str:
    exc_name = type(exc).__name__ if exc is not None else ""
    exc_msg = str(exc) if exc is not None else ""

    if _looks_like_database_failure(exc_name, exc_msg):
        return "CRITICAL"

    fn_lower = function_name.lower()
    if module == "Checkout" and ("payment" in fn_lower or "verify" in fn_lower or "checkout" in fn_lower):
        return "CRITICAL"

    # A "Payments"/"Payments Out" sub-module IS a money-transaction endpoint
    # (recording a payment, not just describing one) -- matches the spec's
    # own example of "Payment transaction failure -> CRITICAL" directly,
    # same tier as Checkout's payment/verify functions above.
    if module in ("Accounting", "Labour") and sub_module in ("Payments Out", "Payments") and status_code >= 500:
        return "CRITICAL"

    if module == "Accounting" and sub_module in ("Bills", "Sales", "Purchase Orders") and status_code >= 500:
        return "HIGH"

    if module == "Labour" and sub_module in ("Payroll", "Advances") and status_code >= 500:
        return "HIGH"

    if module == "Search":
        return "MEDIUM"

    if status_code >= 500:
        return "HIGH"

    return "WARNING"


def _looks_like_database_failure(exc_name: str, exc_msg: str) -> bool:
    if "OperationalError" in exc_name or "DatabaseError" in exc_name or "DisconnectionError" in exc_name:
        return True
    lowered = exc_msg.lower()
    return "database is locked" in lowered or "unable to open database" in lowered
