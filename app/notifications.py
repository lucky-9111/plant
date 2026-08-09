import os
import smtplib
import socket
import urllib.parse
import urllib.request
from email.mime.text import MIMEText


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
