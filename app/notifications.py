import os
import smtplib
import socket
import urllib.parse
import urllib.request
from datetime import datetime
from email.mime.text import MIMEText

from app.settings_helper import get_settings


class _IPv4SMTP(smtplib.SMTP):
    """Some hosts (e.g. Render) advertise IPv6 but can't actually route it,
    causing 'Network is unreachable' against Gmail's dual-stack SMTP. Force
    the socket to resolve via IPv4 while keeping the hostname for TLS SNI."""

    def _get_socket(self, host, port, timeout):
        ipv4_host = socket.gethostbyname(host)
        return socket.create_connection((ipv4_host, port), timeout, self.source_address)


def send_email(to_email: str, subject: str, body: str) -> None:
    if not to_email:
        return

    host = os.environ.get("SMTP_HOST", "")
    if not host:
        print(f"[email] SMTP not configured, skipping send to {to_email}: {subject}")
        return

    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "")
    password = os.environ.get("SMTP_PASSWORD", "")
    sender = os.environ.get("SMTP_FROM", user or "no-reply@aaijinursery.com")

    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = sender
        msg["To"] = to_email

        with _IPv4SMTP(host, port, timeout=10) as server:
            server.starttls()
            if user:
                server.login(user, password)
            server.sendmail(sender, [to_email], msg.as_string())
    except Exception as exc:  # noqa: BLE001 - notifications must never break the request
        print(f"[email] Failed to send to {to_email}: {exc}")


def send_whatsapp_admin_alert(message: str) -> None:
    phone = os.environ.get("CALLMEBOT_PHONE", "")
    apikey = os.environ.get("CALLMEBOT_APIKEY", "")
    if not phone or not apikey:
        print(f"[whatsapp] CallMeBot not configured, skipping alert: {message}")
        return

    try:
        query = urllib.parse.urlencode({"phone": phone, "text": message, "apikey": apikey})
        url = f"https://api.callmebot.com/whatsapp.php?{query}"
        with urllib.request.urlopen(url, timeout=10) as response:
            response.read()
    except Exception as exc:  # noqa: BLE001 - notifications must never break the request
        print(f"[whatsapp] Failed to send alert: {exc}")


def notify_order_status(order, old_status: str | None, new_status: str) -> None:
    message = f"Your order #{order.id} has been {new_status}."
    customer_email = order.customer.email if order.customer else None
    send_email(customer_email, f"Order #{order.id} update - {new_status}", message)
    send_whatsapp_admin_alert(f"Order #{order.id}: {old_status or 'New'} -> {new_status}")


def _format_order_items(order) -> str:
    lines = [
        f"  - {item.plant_name} x{item.quantity} - Rs.{item.line_total}" for item in order.items
    ]
    return "\n".join(lines) if lines else "  (no items)"


def notify_order_cancelled(db, order, old_status: str | None, cancelled_by: str, reason: str) -> None:
    """Send a detailed cancellation email to both the customer and the business's
    admin contact email (from Site Settings -> Contact -> Email). cancelled_by is
    either 'customer' or 'admin'."""
    items_text = _format_order_items(order)
    cancelled_at = (order.updated_at or datetime.utcnow()).strftime("%d %b %Y, %I:%M %p")
    reason_text = reason.strip() if reason and reason.strip() else "Not specified"
    who_label = "Customer" if cancelled_by == "customer" else "Admin"

    customer_email = order.customer.email if order.customer else None
    customer_body = (
        "Your order has been successfully cancelled.\n\n"
        f"Order Number: #{order.id}\n"
        f"Status: Cancelled\n"
        f"Cancelled At: {cancelled_at}\n"
        f"Reason: {reason_text}\n\n"
        f"Items:\n{items_text}\n\n"
        f"Order Total: Rs.{order.total_amount}\n\n"
        "If you have any questions, please contact us."
    )
    send_email(customer_email, f"Your Order #{order.id} Has Been Cancelled", customer_body)

    admin_email = get_settings(db).get("email", "")
    customer_name = order.customer.name if order.customer else "Unknown"
    customer_phone = (order.customer.mobile if order.customer else "") or order.delivery_mobile
    admin_body = (
        f"Order #{order.id} has been cancelled.\n\n"
        f"Customer: {customer_name}\n"
        f"Email: {customer_email or '-'}\n"
        f"Phone: {customer_phone or '-'}\n"
        f"Cancelled At: {cancelled_at}\n"
        f"Cancelled By: {who_label}\n"
        f"Reason: {reason_text}\n"
        f"Order Total: Rs.{order.total_amount}\n\n"
        f"Items:\n{items_text}"
    )
    send_email(admin_email, f"Order Cancelled - #{order.id}", admin_body)

    send_whatsapp_admin_alert(f"Order #{order.id} CANCELLED by {cancelled_by}. Reason: {reason_text}")
