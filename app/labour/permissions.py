"""Reuses the exact same accounting_role axis and require_roles() dependency
already built for the Accounting module (app/accounting/permissions.py) --
Employee & Labour is financially sensitive in the same way, so it doesn't
need a second, parallel permission system yet. Granular section-49-style
permissions (View Employees / Create Payment / etc.) are deferred to a
later phase."""
from app.accounting.permissions import get_accounting_role, require_roles  # noqa: F401

# Payroll/attendance/advances/payments are gated to the same financial
# roles as Accounting's purchase-side writes -- Sales/Purchase Staff don't
# get labour-management access by default.
LABOUR_WRITE_ROLES = {"Owner", "Admin", "Accountant"}
