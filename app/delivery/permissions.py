"""Reuses the same accounting_role axis and require_roles() dependency
already built for Accounting/Labour -- no new parallel permission system.
Delivery writes are gated to Owner/Admin/Accountant, same tier as the
other operational modules; Driver Portal auth (Phase C) is separate."""
from app.accounting.permissions import get_accounting_role, require_roles  # noqa: F401

DELIVERY_WRITE_ROLES = {"Owner", "Admin", "Accountant"}
