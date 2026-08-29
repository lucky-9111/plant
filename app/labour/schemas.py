from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


# ---------- Employee (extended fields only -- see app/accounting/schemas.py
# for the original simple directory schema, still used by the old page) ----------

class EmployeeFullIn(BaseModel):
    name: str
    role: str = ""  # designation
    email: str = ""
    phone: str = ""
    salary: float = 0  # monthly salary
    joining_date: Optional[datetime] = None
    department: str = ""
    overtime_rate: float = 0
    status: str = "Active"
    payment_method: str = "Cash"
    bank_details: str = ""
    notes: str = ""


class EmployeeFullOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    role: str
    email: str
    phone: str
    salary: float
    joining_date: Optional[datetime] = None
    department: str
    overtime_rate: float
    status: str
    payment_method: str
    bank_details: str
    notes: str
    is_active: bool
    created_at: datetime
    # Computed summary (filled in by the router)
    outstanding: float = 0


# ---------- Labour ----------

class LabourIn(BaseModel):
    name: str
    phone: str = ""
    address: str = ""
    joining_date: Optional[datetime] = None
    daily_wage: float = 0
    overtime_rate: float = 0
    work_type: str = ""
    status: str = "Active"
    payment_method: str = "Cash"
    bank_details: str = ""
    notes: str = ""


class LabourOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    phone: str
    address: str
    joining_date: Optional[datetime] = None
    daily_wage: float
    overtime_rate: float
    work_type: str
    status: str
    payment_method: str
    bank_details: str
    notes: str
    created_at: datetime
    outstanding: float = 0


# ---------- Work Requirements / Assignments ----------

class WorkAssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    labour_id: int
    status: str
    responded_at: Optional[datetime] = None
    created_at: datetime
    labour: Optional[LabourOut] = None


class WorkRequirementIn(BaseModel):
    work_date: datetime
    work_type: str = ""
    required_count: int = 0
    location: str = ""
    estimated_hours: float = 0
    notes: str = ""
    labour_ids: List[int] = []  # workers to send a work request to immediately


class WorkRequirementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    work_date: datetime
    work_type: str
    required_count: int
    location: str
    estimated_hours: float
    notes: str
    created_by: str
    created_at: datetime
    assignments: List[WorkAssignmentOut] = []


class WorkAssignmentStatusIn(BaseModel):
    status: str  # Accepted | Rejected | Cancelled


# ---------- Attendance ----------

class EmployeeAttendanceIn(BaseModel):
    employee_id: int
    attendance_date: datetime
    status: str = "Present"
    overtime_hours: float = 0
    notes: str = ""


class EmployeeAttendanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int
    attendance_date: datetime
    status: str
    overtime_hours: float
    notes: str
    created_by: str
    created_at: datetime


class LabourAttendanceIn(BaseModel):
    labour_id: int
    work_assignment_id: Optional[int] = None
    attendance_date: datetime
    status: str = "Worked"
    overtime_hours: float = 0
    notes: str = ""


class LabourAttendanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    labour_id: int
    work_assignment_id: Optional[int] = None
    attendance_date: datetime
    status: str
    overtime_hours: float
    daily_wage_snapshot: float
    overtime_rate_snapshot: float
    base_earned: float
    overtime_earned: float
    earned_amount: float
    notes: str
    created_by: str
    created_at: datetime


# ---------- Payroll ----------

class PayrollGenerateIn(BaseModel):
    worker_type: str  # EMPLOYEE | LABOUR
    period_year: int
    period_month: int
    employee_id: Optional[int] = None
    labour_id: Optional[int] = None


class PayrollAdjustIn(BaseModel):
    advance_recovery: float = 0
    deductions: float = 0
    notes: str = ""


class PayrollOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    worker_type: str
    employee_id: Optional[int] = None
    labour_id: Optional[int] = None
    period_year: int
    period_month: int
    rate_snapshot: float
    days_present: float
    days_absent: float
    basic_earnings: float
    overtime_earnings: float
    gross_earnings: float
    advance_recovery: float
    deductions: float
    net_payable: float
    status: str
    generated_by: str
    generated_at: datetime
    finalized_by: str
    finalized_at: Optional[datetime] = None
    notes: str
    worker_name: str = ""
    total_paid: float = 0
    outstanding: float = 0


# ---------- Advances ----------

class WorkerAdvanceIn(BaseModel):
    worker_type: str
    employee_id: Optional[int] = None
    labour_id: Optional[int] = None
    amount: float
    advance_date: datetime
    reason: str = ""


class AdvanceRecoveryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    payroll_id: int
    amount: float
    recovered_at: datetime
    created_by: str


class WorkerAdvanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    worker_type: str
    employee_id: Optional[int] = None
    labour_id: Optional[int] = None
    amount: float
    advance_date: datetime
    reason: str
    created_by: str
    created_at: datetime
    recovered_amount: float = 0
    remaining_amount: float = 0
    recoveries: List[AdvanceRecoveryOut] = []


# ---------- Worker Payments ----------

class WorkerPaymentIn(BaseModel):
    worker_type: str
    employee_id: Optional[int] = None
    labour_id: Optional[int] = None
    payroll_id: Optional[int] = None
    amount: float
    payment_date: datetime
    method: str = "Cash"
    reference: str = ""
    notes: str = ""


class WorkerPaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    worker_type: str
    employee_id: Optional[int] = None
    labour_id: Optional[int] = None
    payroll_id: Optional[int] = None
    amount: float
    payment_date: datetime
    method: str
    reference: str
    notes: str
    created_by: str
    created_at: datetime


# ---------- Dashboard ----------

class TodayAttendanceSummaryOut(BaseModel):
    employees_total: int = 0
    employees_present: int = 0
    employees_absent: int = 0
    employees_leave: int = 0
    labour_available: int = 0
    labour_called: int = 0
    labour_accepted: int = 0
    labour_present: int = 0
    labour_absent: int = 0
    estimated_labour_cost: float = 0


class MonthlyCostSummaryOut(BaseModel):
    period_year: int
    period_month: int
    employee_salary_cost: float = 0
    labour_wage_cost: float = 0
    overtime_cost: float = 0
    advances_given: float = 0
    total_paid: float = 0
    total_outstanding: float = 0
