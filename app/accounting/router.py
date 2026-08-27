from fastapi import APIRouter

from app.accounting.router_accounts import router as accounts_router
from app.accounting.router_contacts import router as contacts_router
from app.accounting.router_overview import router as overview_router
from app.accounting.router_sales import router as sales_router
from app.accounting.router_tax_rates import router as tax_rates_router

router = APIRouter(prefix="/api/admin/accounting")
router.include_router(overview_router)
router.include_router(accounts_router)
router.include_router(tax_rates_router)
router.include_router(contacts_router)
router.include_router(sales_router)
