import os

import razorpay
from fastapi import HTTPException


def _get_client() -> razorpay.Client:
    key_id = os.environ.get("RAZORPAY_KEY_ID", "")
    key_secret = os.environ.get("RAZORPAY_KEY_SECRET", "")
    if not key_id or not key_secret:
        raise HTTPException(status_code=500, detail="Online payment is not configured")
    return razorpay.Client(auth=(key_id, key_secret))


def create_razorpay_order(amount_rupees: float, receipt: str) -> dict:
    """Create a Razorpay order for the given amount (in rupees). Amount must
    already be computed server-side from trusted database values."""
    client = _get_client()
    amount_paise = int(round(amount_rupees * 100))
    if amount_paise < 100:
        raise HTTPException(status_code=400, detail="Order amount is too low for online payment")
    try:
        return client.order.create(
            {
                "amount": amount_paise,
                "currency": "INR",
                "receipt": receipt,
                "payment_capture": 1,
            }
        )
    except HTTPException:
        raise
    except Exception:  # noqa: BLE001 - any SDK/network failure must not crash checkout
        raise HTTPException(
            status_code=502, detail="Could not reach the payment gateway. Please try again."
        )


def verify_payment_signature(razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> bool:
    client = _get_client()
    try:
        client.utility.verify_payment_signature(
            {
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            }
        )
        return True
    except razorpay.errors.SignatureVerificationError:
        return False
    except Exception:  # noqa: BLE001 - treat any verification failure as "not verified"
        return False
