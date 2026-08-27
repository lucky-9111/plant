"""Accounting module data models.

Everything here is brand new -- no existing table (Order, OrderItem, Customer,
Plant, ...) is altered. Where an accounting record needs to point at a real
website record (a website Order, a website Customer), it does so via a plain,
one-directional foreign key with no `back_populates` on the website side, so
none of those existing model classes need any change at all.

The only existing table extended by this module is `purchases` (via an
ALTER TABLE shim in app/main.py, same pattern already used there for every
other schema change) -- adding `status`/`due_date`/`source`/`contact_id`
columns so the existing Purchase/PurchaseItem feature (shipped earlier this
session) can also serve as the "Bill" concept, without duplicating it under
a new table name.
"""

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from app.database import Base

ACCOUNT_TYPES = ["Asset", "Liability", "Equity", "Income", "Expense"]
CONTACT_TYPES = ["customer", "supplier", "both"]
SOURCES = ["online", "offline"]
SALES_ORDER_STATUSES = ["Draft", "Confirmed", "Invoiced", "Cancelled", "Voided"]
INVOICE_STATUSES = ["Draft", "Sent", "PartiallyPaid", "Paid", "Overdue", "Cancelled", "Voided"]
PAYMENT_METHODS = ["Cash", "Bank", "UPI", "Card", "Online", "Other"]


class Account(Base):
    """Chart of Accounts -- self-referential parent for a simple tree
    (Assets/Liabilities/Equity/Income/Expenses, each with sub-accounts)."""

    __tablename__ = "accounting_accounts"
    __table_args__ = (UniqueConstraint("code", name="uq_account_code"),)

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20), nullable=False)
    name = Column(String(150), nullable=False)
    account_type = Column(String(20), nullable=False, index=True)  # one of ACCOUNT_TYPES
    parent_id = Column(Integer, ForeignKey("accounting_accounts.id"), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    parent = relationship("Account", remote_side=[id], backref="children")


class TaxRate(Base):
    __tablename__ = "accounting_tax_rates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(60), nullable=False)  # e.g. "GST 18%"
    rate_percent = Column(Float, nullable=False, default=0)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Contact(Base):
    """Unified customer/supplier ledger entity. An 'online' contact is a
    read-linked mirror of a real website Customer row (never the source of
    truth for login/profile fields -- that stays owned by Customer) so
    accounting documents can FK to one stable Contact regardless of whether
    the underlying party is a website customer or a manually-entered
    supplier/customer."""

    __tablename__ = "accounting_contacts"
    __table_args__ = (UniqueConstraint("source", "source_id", name="uq_contact_source"),)

    id = Column(Integer, primary_key=True, index=True)
    contact_type = Column(String(10), nullable=False, default="customer", index=True)
    name = Column(String(150), nullable=False)
    email = Column(String(180), default="")
    phone = Column(String(30), default="")
    address = Column(Text, default="")
    gstin = Column(String(20), default="")
    source = Column(String(10), nullable=False, default="offline", index=True)
    source_id = Column(String(40), nullable=True)  # str(Customer.id) when source == "online"
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True, index=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer")  # one-directional; Customer itself is untouched


class SalesOrder(Base):
    __tablename__ = "accounting_sales_orders"
    __table_args__ = (UniqueConstraint("source", "source_id", name="uq_salesorder_source"),)

    id = Column(Integer, primary_key=True, index=True)
    contact_id = Column(Integer, ForeignKey("accounting_contacts.id"), nullable=False, index=True)
    order_number = Column(String(40), default="")
    status = Column(String(20), nullable=False, default="Draft", index=True)
    order_date = Column(DateTime, default=datetime.utcnow, index=True)
    subtotal = Column(Float, default=0)
    tax_total = Column(Float, default=0)
    total_amount = Column(Float, default=0)
    notes = Column(Text, default="")
    source = Column(String(10), nullable=False, default="offline", index=True)
    source_id = Column(String(40), nullable=True)
    order_ref_id = Column(Integer, ForeignKey("orders.id"), nullable=True, index=True)  # read-only pointer
    created_by = Column(String(80), default="")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    contact = relationship("Contact")
    order_ref = relationship("Order")  # one-directional; Order itself is untouched
    items = relationship("SalesOrderItem", back_populates="sales_order", cascade="all, delete-orphan")
    invoices = relationship("Invoice", back_populates="sales_order")


class SalesOrderItem(Base):
    __tablename__ = "accounting_sales_order_items"

    id = Column(Integer, primary_key=True, index=True)
    sales_order_id = Column(Integer, ForeignKey("accounting_sales_orders.id"), nullable=False, index=True)
    plant_id = Column(Integer, ForeignKey("plants.id"), nullable=True)
    description = Column(String(200), default="")
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0)
    tax_rate_id = Column(Integer, ForeignKey("accounting_tax_rates.id"), nullable=True)
    tax_amount = Column(Float, default=0)
    line_total = Column(Float, default=0)

    sales_order = relationship("SalesOrder", back_populates="items")
    plant = relationship("Plant")


class Invoice(Base):
    __tablename__ = "accounting_invoices"
    __table_args__ = (UniqueConstraint("source", "source_id", name="uq_invoice_source"),)

    id = Column(Integer, primary_key=True, index=True)
    sales_order_id = Column(Integer, ForeignKey("accounting_sales_orders.id"), nullable=False, index=True)
    contact_id = Column(Integer, ForeignKey("accounting_contacts.id"), nullable=False, index=True)
    invoice_number = Column(String(40), default="")
    status = Column(String(20), nullable=False, default="Draft", index=True)
    invoice_date = Column(DateTime, default=datetime.utcnow, index=True)
    due_date = Column(DateTime, nullable=True)
    subtotal = Column(Float, default=0)
    tax_total = Column(Float, default=0)
    discount_total = Column(Float, default=0)
    total_amount = Column(Float, default=0)
    amount_paid = Column(Float, default=0)
    balance_due = Column(Float, default=0)
    source = Column(String(10), nullable=False, default="offline", index=True)
    source_id = Column(String(40), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    sales_order = relationship("SalesOrder", back_populates="invoices")
    contact = relationship("Contact")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    payments = relationship("PaymentIn", back_populates="invoice")


class InvoiceItem(Base):
    __tablename__ = "accounting_invoice_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("accounting_invoices.id"), nullable=False, index=True)
    description = Column(String(200), default="")
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0)
    tax_rate_id = Column(Integer, ForeignKey("accounting_tax_rates.id"), nullable=True)
    tax_amount = Column(Float, default=0)
    line_total = Column(Float, default=0)

    invoice = relationship("Invoice", back_populates="items")


class PaymentIn(Base):
    __tablename__ = "accounting_payments_in"
    __table_args__ = (UniqueConstraint("source", "source_id", name="uq_paymentin_source"),)

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("accounting_invoices.id"), nullable=False, index=True)
    contact_id = Column(Integer, ForeignKey("accounting_contacts.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False, default=0)
    method = Column(String(20), nullable=False, default="Cash")
    payment_date = Column(DateTime, default=datetime.utcnow, index=True)
    reference = Column(String(120), default="")
    notes = Column(Text, default="")
    source = Column(String(10), nullable=False, default="offline", index=True)
    source_id = Column(String(60), nullable=True)  # e.g. f"order:{order.id}:payment"
    created_at = Column(DateTime, default=datetime.utcnow)

    invoice = relationship("Invoice", back_populates="payments")
    contact = relationship("Contact")


class AuditLog(Base):
    """Field-level diff: one row PER CHANGED FIELD, not one row per action --
    distinct from (and additive to) the existing shallow AdminActivityLog,
    which only stores a free-text summary line."""

    __tablename__ = "accounting_audit_log"
    __table_args__ = (Index("ix_auditlog_table_record", "table_name", "record_id"),)

    id = Column(Integer, primary_key=True, index=True)
    table_name = Column(String(60), nullable=False, index=True)
    record_id = Column(Integer, nullable=False, index=True)
    action = Column(String(20), nullable=False)  # create | update | void | cancel
    field_name = Column(String(60), nullable=True)  # NULL for whole-row create/void actions
    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    changed_by = Column(String(80), default="")
    changed_at = Column(DateTime, default=datetime.utcnow, index=True)
