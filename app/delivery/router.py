from fastapi import APIRouter

from app.delivery.router_deliveries import router as deliveries_router
from app.delivery.router_drivers import router as drivers_router
from app.delivery.router_fuel import router as fuel_router
from app.delivery.router_trips import router as trips_router
from app.delivery.router_vehicles import router as vehicles_router

router = APIRouter(prefix="/api/admin/delivery")
router.include_router(deliveries_router)
router.include_router(drivers_router)
router.include_router(vehicles_router)
router.include_router(trips_router)
router.include_router(fuel_router)
