from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.accounting.models import Employee
from app.database import get_db
from app.deps import get_current_admin
from app.labour import ledger
from app.labour.models import (
    EmployeeAttendance,
    Labour,
    LabourAttendance,
    Payroll,
    WorkAssignment,
    WorkerAdvance,
    WorkerPayment,
    WorkRequirement,
)
from app.labour.schemas import MonthlyCostSummaryOut, TodayAttendanceSummaryOut

router = APIRouter(tags=["labour-dashboard"])


def _today_bounds():
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    return today, today + timedelta(days=1)


@router.get("/dashboard/today", response_model=TodayAttendanceSummaryOut)
def today_summary(admin: str = Depends(get_current_admin), db: Session = Depends(get_db)):
    start, end = _today_bounds()

    employees_total = db.query(Employee).filter(Employee.status == "Active").count()
    today_emp_attendance = (
        db.query(EmployeeAttendance)
        .filter(EmployeeAttendance.attendance_date >= start, EmployeeAttendance.attendance_date < end)
        .all()
    )
    employees_present = sum(1 for a in today_emp_attendance if a.status == "Present")
    employees_absent = sum(1 for a in today_emp_attendance if a.status == "Absent")
    employees_leave = sum(1 for a in today_emp_attendance if a.status == "Leave")

    labour_available = db.query(Labour).filter(Labour.status == "Active").count()
    today_assignments = (
        db.query(WorkAssignment)
        .join(WorkRequirement, WorkRequirement.id == WorkAssignment.work_requirement_id)
        .filter(WorkRequirement.work_date >= start, WorkRequirement.work_date < end)
        .all()
    )
    labour_called = len(today_assignments)
    labour_accepted = sum(1 for a in today_assignments if a.status == "Accepted")

    today_labour_attendance = (
        db.query(LabourAttendance)
        .filter(LabourAttendance.attendance_date >= start, LabourAttendance.attendance_date < end)
        .all()
    )
    labour_present = sum(1 for a in today_labour_attendance if a.status in ("Worked", "Half Day"))
    labour_absent = sum(1 for a in today_labour_attendance if a.status == "Not Worked")
    estimated_labour_cost = round(sum(a.earned_amount or 0 for a in today_labour_attendance), 2)

    return TodayAttendanceSummaryOut(
        employees_total=employees_total,
        employees_present=employees_present,
        employees_absent=employees_absent,
        employees_leave=employees_leave,
        labour_available=labour_available,
        labour_called=labour_called,
        labour_accepted=labour_accepted,
        labour_present=labour_present,
        labour_absent=labour_absent,
        estimated_labour_cost=estimated_labour_cost,
    )


@router.get("/dashboard/monthly-cost", response_model=MonthlyCostSummaryOut)
def monthly_cost_summary(
    period_year: int = Query(...),
    period_month: int = Query(...),
    admin: str = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    payrolls = (
        db.query(Payroll)
        .filter(Payroll.period_year == period_year, Payroll.period_month == period_month)
        .all()
    )
    employee_salary_cost = round(
        sum(p.gross_earnings for p in payrolls if p.worker_type == "EMPLOYEE"), 2
    )
    labour_wage_cost = round(sum(p.basic_earnings for p in payrolls if p.worker_type == "LABOUR"), 2)
    overtime_cost = round(sum(p.overtime_earnings for p in payrolls), 2)

    month_start = datetime(period_year, period_month, 1)
    month_end = datetime(period_year + 1, 1, 1) if period_month == 12 else datetime(period_year, period_month + 1, 1)

    month_advances = (
        db.query(WorkerAdvance)
        .filter(WorkerAdvance.advance_date >= month_start, WorkerAdvance.advance_date < month_end)
        .all()
    )
    advances_given = round(sum(a.amount for a in month_advances), 2)
    total_paid = round(
        sum(
            p.amount
            for p in db.query(WorkerPayment)
            .filter(WorkerPayment.payment_date >= month_start, WorkerPayment.payment_date < month_end)
            .all()
        ),
        2,
    )
    total_outstanding = round(
        sum(p.net_payable - ledger.payroll_total_paid(db, p.id) for p in payrolls), 2
    )

    return MonthlyCostSummaryOut(
        period_year=period_year,
        period_month=period_month,
        employee_salary_cost=employee_salary_cost,
        labour_wage_cost=labour_wage_cost,
        overtime_cost=overtime_cost,
        advances_given=advances_given,
        total_paid=total_paid,
        total_outstanding=total_outstanding,
    )
