"""Employee & Labour Management module (Phase A + B of the master prompt).

Nothing here touches the existing website/order/checkout/payment tables.
The one existing table this module extends is `accounting_employees`
(Phase 2 of the Accounting module) -- via an additive ALTER TABLE shim in
app/main.py, same pattern used everywhere else in this codebase -- so the
existing simple Employee directory CRUD page keeps working completely
unchanged; this module just adds new nullable columns it also reads/writes.

Historical rate protection (master prompt #37): every attendance/payroll
row stores the rate that was *actually in effect* at the time it was
computed (daily_wage_snapshot, overtime_rate_snapshot, monthly_salary
snapshot on Payroll), never the worker's current rate. Changing a
worker's rate later never recalculates past records.

Outstanding is never a stored mutable number (#45) -- it's always derived
at read time from: earnings - advance recovery - deductions - payments.
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

WORKER_TYPES = ["EMPLOYEE", "LABOUR"]

EMPLOYEE_STATUSES = ["Active", "Inactive", "On Leave", "Terminated"]
LABOUR_STATUSES = ["Active", "Inactive"]

EMPLOYEE_ATTENDANCE_STATUSES = ["Present", "Absent", "Half Day", "Leave", "Holiday"]
LABOUR_ATTENDANCE_STATUSES = ["Worked", "Not Worked", "Half Day"]

WORK_REQUEST_STATUSES = ["Pending", "Accepted", "Rejected", "No Response", "Cancelled"]

PAYROLL_STATUSES = ["Draft", "Finalized"]

PAYMENT_METHODS = ["Cash", "Bank Transfer", "UPI", "Card", "Other"]

# Single edit point for the half-day pay ratio -- matches the codebase's
# existing "tunable constant" convention (see app/analytics_utils.py).
HALF_DAY_RATIO = 0.5


class Labour(Base):
    """Daily-wage worker -- called only when work is available (unlike
    Employee, which is always on monthly salary regardless of daily work)."""

    __tablename__ = "labour_workers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    phone = Column(String(30), default="")
    address = Column(Text, default="")
    joining_date = Column(DateTime, nullable=True)
    daily_wage = Column(Float, nullable=False, default=0)
    overtime_rate = Column(Float, default=0)  # per hour
    work_type = Column(String(100), default="")  # skill / kind of work
    status = Column(String(20), nullable=False, default="Active", index=True)
    payment_method = Column(String(20), default="Cash")
    bank_details = Column(Text, default="")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class WorkRequirement(Base):
    """"Today's Work" -- a work order for a given date that admin then
    staffs by sending work requests to specific Labour workers."""

    __tablename__ = "labour_work_requirements"

    id = Column(Integer, primary_key=True, index=True)
    work_date = Column(DateTime, nullable=False, index=True)
    work_type = Column(String(100), nullable=False, default="")
    required_count = Column(Integer, default=0)
    location = Column(String(150), default="")
    estimated_hours = Column(Float, default=0)
    notes = Column(Text, default="")
    created_by = Column(String(80), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    assignments = relationship(
        "WorkAssignment", back_populates="work_requirement", cascade="all, delete-orphan"
    )


class WorkAssignment(Base):
    """One Labour worker's request/response status against a WorkRequirement."""

    __tablename__ = "labour_work_assignments"
    __table_args__ = (
        UniqueConstraint("work_requirement_id", "labour_id", name="uq_work_assignment"),
    )

    id = Column(Integer, primary_key=True, index=True)
    work_requirement_id = Column(
        Integer, ForeignKey("labour_work_requirements.id"), nullable=False, index=True
    )
    labour_id = Column(Integer, ForeignKey("labour_workers.id"), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="Pending", index=True)
    responded_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    work_requirement = relationship("WorkRequirement", back_populates="assignments")
    labour = relationship("Labour")


class EmployeeAttendance(Base):
    __tablename__ = "labour_employee_attendance"
    __table_args__ = (
        UniqueConstraint("employee_id", "attendance_date", name="uq_employee_attendance_date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("accounting_employees.id"), nullable=False, index=True)
    attendance_date = Column(DateTime, nullable=False, index=True)
    status = Column(String(20), nullable=False, default="Present")
    overtime_hours = Column(Float, default=0)
    notes = Column(Text, default="")
    created_by = Column(String(80), default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class LabourAttendance(Base):
    """Earned amounts are computed and frozen (snapshotted) at the moment
    attendance is marked -- never recalculated from the Labour's current
    daily_wage/overtime_rate later."""

    __tablename__ = "labour_labour_attendance"
    __table_args__ = (
        UniqueConstraint("labour_id", "attendance_date", name="uq_labour_attendance_date"),
    )

    id = Column(Integer, primary_key=True, index=True)
    labour_id = Column(Integer, ForeignKey("labour_workers.id"), nullable=False, index=True)
    work_assignment_id = Column(
        Integer, ForeignKey("labour_work_assignments.id"), nullable=True, index=True
    )
    attendance_date = Column(DateTime, nullable=False, index=True)
    status = Column(String(20), nullable=False, default="Worked")
    overtime_hours = Column(Float, default=0)

    daily_wage_snapshot = Column(Float, default=0)
    overtime_rate_snapshot = Column(Float, default=0)
    base_earned = Column(Float, default=0)
    overtime_earned = Column(Float, default=0)
    earned_amount = Column(Float, default=0)  # base_earned + overtime_earned

    notes = Column(Text, default="")
    created_by = Column(String(80), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    labour = relationship("Labour")
    work_assignment = relationship("WorkAssignment")


class Payroll(Base):
    """One row per worker per calendar month -- a snapshot/lock of that
    month's earnings, not the source of truth for daily labour earnings
    (those live on LabourAttendance rows and are payable/visible even
    before a Payroll row is generated -- see master prompt #12/#18/#19).
    For Employees, monthly salary earning only exists once this row is
    generated, since it depends on the whole month's attendance."""

    __tablename__ = "labour_payroll"
    __table_args__ = (
        UniqueConstraint(
            "worker_type", "employee_id", "labour_id", "period_year", "period_month",
            name="uq_payroll_worker_period",
        ),
        Index("ix_payroll_period", "period_year", "period_month"),
    )

    id = Column(Integer, primary_key=True, index=True)
    worker_type = Column(String(10), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("accounting_employees.id"), nullable=True, index=True)
    labour_id = Column(Integer, ForeignKey("labour_workers.id"), nullable=True, index=True)
    period_year = Column(Integer, nullable=False, index=True)
    period_month = Column(Integer, nullable=False, index=True)  # 1-12

    # Historical-rate snapshot (frozen at generation time)
    rate_snapshot = Column(Float, default=0)  # monthly_salary for Employee, daily_wage for Labour

    days_present = Column(Float, default=0)  # half-days counted as 0.5
    days_absent = Column(Float, default=0)
    basic_earnings = Column(Float, default=0)
    overtime_earnings = Column(Float, default=0)
    gross_earnings = Column(Float, default=0)
    advance_recovery = Column(Float, default=0)
    deductions = Column(Float, default=0)
    net_payable = Column(Float, default=0)

    status = Column(String(20), nullable=False, default="Draft", index=True)
    generated_by = Column(String(80), default="")
    generated_at = Column(DateTime, default=datetime.utcnow)
    finalized_by = Column(String(80), default="")
    finalized_at = Column(DateTime, nullable=True)
    notes = Column(Text, default="")

    employee = relationship("Employee")
    labour = relationship("Labour")
    advance_recoveries = relationship("AdvanceRecovery", back_populates="payroll")


class WorkerAdvance(Base):
    __tablename__ = "labour_worker_advances"

    id = Column(Integer, primary_key=True, index=True)
    worker_type = Column(String(10), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("accounting_employees.id"), nullable=True, index=True)
    labour_id = Column(Integer, ForeignKey("labour_workers.id"), nullable=True, index=True)
    amount = Column(Float, nullable=False, default=0)
    advance_date = Column(DateTime, nullable=False, index=True)
    reason = Column(Text, default="")
    created_by = Column(String(80), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee")
    labour = relationship("Labour")
    recoveries = relationship("AdvanceRecovery", back_populates="advance", cascade="all, delete-orphan")


class AdvanceRecovery(Base):
    """A single recovery transaction against one WorkerAdvance, applied
    during one Payroll cycle -- remaining advance is always derived as
    advance.amount - sum(recoveries), never stored as a mutable field."""

    __tablename__ = "labour_advance_recoveries"

    id = Column(Integer, primary_key=True, index=True)
    advance_id = Column(Integer, ForeignKey("labour_worker_advances.id"), nullable=False, index=True)
    payroll_id = Column(Integer, ForeignKey("labour_payroll.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False, default=0)
    recovered_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String(80), default="")

    advance = relationship("WorkerAdvance", back_populates="recoveries")
    payroll = relationship("Payroll", back_populates="advance_recoveries")


class WorkerPayment(Base):
    """Immutable payment ledger entry -- every payment (same-day, partial,
    or month-end) is its own row, never overwritten (#13)."""

    __tablename__ = "labour_worker_payments"

    id = Column(Integer, primary_key=True, index=True)
    worker_type = Column(String(10), nullable=False, index=True)
    employee_id = Column(Integer, ForeignKey("accounting_employees.id"), nullable=True, index=True)
    labour_id = Column(Integer, ForeignKey("labour_workers.id"), nullable=True, index=True)
    payroll_id = Column(Integer, ForeignKey("labour_payroll.id"), nullable=True, index=True)
    amount = Column(Float, nullable=False, default=0)
    payment_date = Column(DateTime, nullable=False, index=True)
    method = Column(String(20), default="Cash")
    reference = Column(String(120), default="")
    notes = Column(Text, default="")
    created_by = Column(String(80), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee")
    labour = relationship("Labour")
    payroll = relationship("Payroll")
