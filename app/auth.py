import bcrypt
from fastapi import Request
from fastapi.responses import RedirectResponse


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8"),


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def is_logged_in(request: Request) -> bool:
    return bool(request.session.get("admin_username"))


def require_login(request: Request):
    """Returns a RedirectResponse if not logged in, else None."""
    if not is_logged_in(request):
        return RedirectResponse(url="/admin/login", status_code=303)
    return None
