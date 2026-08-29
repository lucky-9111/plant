from fastapi import APIRouter

from app.labour.router_advances import router as advances_router
from app.labour.router_attendance import router as attendance_router
from app.labour.router_dashboard import router as dashboard_router
from app.labour.router_employees import router as employees_router
from app.labour.router_labour import router as labour_router
from app.labour.router_payments import router as payments_router
from app.labour.router_payroll import router as payroll_router
from app.labour.router_work import router as work_router

router = APIRouter(prefix="/api/admin/labour")
router.include_router(dashboard_router)
router.include_router(employees_router)
router.include_router(labour_router)
router.include_router(work_router)
router.include_router(attendance_router)
router.include_router(payroll_router)
router.include_router(advances_router)
router.include_router(payments_router)
