"""
Router aggregator for API v1.
"""
from fastapi import APIRouter
from app.api.v1.endpoints import (
    venues,
    zones,
    telemetry,
    alerts,
    incidents,
    broadcast,
    routing,
    auth,
    analytics
)
from app.api.v1 import websocket

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(venues.router, prefix="/venues", tags=["venues"])
api_router.include_router(zones.router, prefix="/zones", tags=["zones"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["telemetry"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
api_router.include_router(incidents.router, prefix="/citizen-reports", tags=["citizen-reports"])
api_router.include_router(broadcast.router, prefix="/broadcast", tags=["broadcast"])
api_router.include_router(routing.router, prefix="/routing", tags=["routing"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(websocket.router, tags=["websocket"])
