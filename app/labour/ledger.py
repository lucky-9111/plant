"""Every "outstanding"/"remaining" figure in this module is derived at read
time from the transaction ledger (master prompt #45) -- nothing here is a
stored mutable balance. Employee earnings only exist once a Payroll row is
generated for that month (salary depends on the whole month's attendance);
Labour earnings exist immediately per attendance row, independent of
whether a monthly Payroll rollup has been generated yet (#12/#18/#19)."""
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.labour.models import AdvanceRecovery, LabourAttendance, Payroll, WorkerPayment


def employee_total_earned(db: Session, employee_id: int) -> float:
    return (
        db.query(func.coalesce(func.sum(Payroll.gross_earnings), 0))
        .filter(Payroll.employee_id == employee_id, Payroll.worker_type == "EMPLOYEE")
        .scalar()
        or 0
    )


def employee_total_recovery(db: Session, employee_id: int) -> float:
    return (
        db.query(func.coalesce(func.sum(AdvanceRecovery.amount), 0))
        .join(Payroll, Payroll.id == AdvanceRecovery.payroll_id)
        .filter(Payroll.employee_id == employee_id, Payroll.worker_type == "EMPLOYEE")
        .scalar()
        or 0
    )


def employee_total_deductions(db: Session, employee_id: int) -> float:
    return (
        db.query(func.coalesce(func.sum(Payroll.deductions), 0))
        .filter(Payroll.employee_id == employee_id, Payroll.worker_type == "EMPLOYEE")
        .scalar()
        or 0
    )


def employee_total_paid(db: Session, employee_id: int) -> float:
    return (
        db.query(func.coalesce(func.sum(WorkerPayment.amount), 0))
        .filter(WorkerPayment.employee_id == employee_id, WorkerPayment.worker_type == "EMPLOYEE")
        .scalar()
        or 0
    )


def employee_outstanding(db: Session, employee_id: int) -> float:
    earned = employee_total_earned(db, employee_id)
    recovery = employee_total_recovery(db, employee_id)
    deductions = employee_total_deductions(db, employee_id)
    paid = employee_total_paid(db, employee_id)
    return round(earned - recovery - deductions - paid, 2)


def labour_total_earned(db: Session, labour_id: int) -> float:
    return (
        db.query(func.coalesce(func.sum(LabourAttendance.earned_amount), 0))
        .filter(LabourAttendance.labour_id == labour_id)
        .scalar()
        or 0
    )


def labour_total_recovery(db: Session, labour_id: int) -> float:
    return (
        db.query(func.coalesce(func.sum(AdvanceRecovery.amount), 0))
        .join(Payroll, Payroll.id == AdvanceRecovery.payroll_id)
        .filter(Payroll.labour_id == labour_id, Payroll.worker_type == "LABOUR")
        .scalar()
        or 0
    )


def labour_total_deductions(db: Session, labour_id: int) -> float:
    return (
        db.query(func.coalesce(func.sum(Payroll.deductions), 0))
        .filter(Payroll.labour_id == labour_id, Payroll.worker_type == "LABOUR")
        .scalar()
        or 0
    )


def labour_total_paid(db: Session, labour_id: int) -> float:
    return (
        db.query(func.coalesce(func.sum(WorkerPayment.amount), 0))
        .filter(WorkerPayment.labour_id == labour_id, WorkerPayment.worker_type == "LABOUR")
        .scalar()
        or 0
    )


def labour_outstanding(db: Session, labour_id: int) -> float:
    earned = labour_total_earned(db, labour_id)
    recovery = labour_total_recovery(db, labour_id)
    deductions = labour_total_deductions(db, labour_id)
    paid = labour_total_paid(db, labour_id)
    return round(earned - recovery - deductions - paid, 2)


def advance_recovered_amount(db: Session, advance_id: int) -> float:
    return (
        db.query(func.coalesce(func.sum(AdvanceRecovery.amount), 0))
        .filter(AdvanceRecovery.advance_id == advance_id)
        .scalar()
        or 0
    )


def payroll_total_paid(db: Session, payroll_id: int) -> float:
    return (
        db.query(func.coalesce(func.sum(WorkerPayment.amount), 0))
        .filter(WorkerPayment.payroll_id == payroll_id)
        .scalar()
        or 0
    )
