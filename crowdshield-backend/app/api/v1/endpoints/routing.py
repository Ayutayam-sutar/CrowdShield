"""
Routing endpoint for A* Evacuation Path Computation.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional

from app.db.session import get_db
from app.models.venue import Zone
from app.services.pathfinding import pathfinder

router = APIRouter()

class RoutingRequest(BaseModel):
    venue_id: str
    current_lat: float
    current_lng: float

class Waypoint(BaseModel):
    lat: float
    lng: float
    zone_name: str

class RoutingResponse(BaseModel):
    status: str
    message: str
    total_distance_meters: float
    estimated_time_minutes: float
    avoided_surge_zones: List[str]
    waypoints: List[Waypoint]

@router.post("/evacuate", response_model=RoutingResponse)
@router.post("/evacuate/", response_model=RoutingResponse)
async def compute_evacuation_route(request: RoutingRequest, db: AsyncSession = Depends(get_db)):
    """
    Computes the safest A* evacuation path using physical JSON topology + DB telemetry penalties.
    """
    # 1. Fetch zones for venue, with fallback to all zones if venue_id string differs
    result = await db.execute(select(Zone).where(Zone.venue_id == request.venue_id))
    zones = result.scalars().all()
    
    if not zones:
        result = await db.execute(select(Zone))
        zones = result.scalars().all()
        
    if not zones:
        raise HTTPException(status_code=404, detail="No live zones found in database. Run seed_venue.py.")
        
    # 2. Update the physical graph with live telemetry
    pathfinder.update_live_telemetry(zones)

    # 3. Find the nearest valid physical zone to the user's GPS coordinates
    start_zone = None
    min_dist = float('inf')
    for z in zones:
        dist = ((z.center_lat - request.current_lat)**2 + (z.center_lng - request.current_lng)**2)**0.5
        if dist < min_dist:
            min_dist = dist
            start_zone = z
            
    if not start_zone or start_zone.id not in pathfinder.graph:
        # Graceful fallback: Snap to first available graph node
        first_node = list(pathfinder.graph.nodes)[0] if pathfinder.graph.nodes else None
        if not first_node:
            raise HTTPException(status_code=400, detail="Could not snap location to a valid physical zone.")
        start_zone_id = first_node
    else:
        start_zone_id = start_zone.id

    # 4. Calculate safest path to an exit
    evac_result = pathfinder.compute_safest_evacuation(start_zone_id)
    
    if evac_result["status"] != "SUCCESS":
        return RoutingResponse(
            status="BLOCKED",
            message=evac_result["message"],
            total_distance_meters=0.0,
            estimated_time_minutes=0.0,
            avoided_surge_zones=[],
            waypoints=[]
        )

    path_nodes = evac_result["path_nodes"]

    # 5. Construct response metrics and waypoints
    waypoints = []
    avoided_zones = set()
    total_distance = 0.0
    
    prev_node = None
    for node_id in path_nodes:
        node_data = pathfinder.graph.nodes[node_id]
        
        waypoints.append(Waypoint(
            lat=node_data.get('lat', 20.2496),
            lng=node_data.get('lng', 85.7988),
            zone_name=node_data.get('name', f"Zone {node_id}")
        ))
        
        if prev_node:
            edge_data = pathfinder.graph.get_edge_data(prev_node, node_id, {})
            total_distance += edge_data.get('base_weight', 10.0)
            
        prev_node = node_id

    # Find which critical zones the A* algorithm successfully bypassed
    for z in zones:
        risk_val = getattr(z.risk_level, "value", str(z.risk_level)).lower()
        if risk_val == 'critical' and z.id not in path_nodes:
            avoided_zones.add(z.name)

    estimated_time = total_distance / 72.0

    return RoutingResponse(
        status="SUCCESS",
        message=evac_result["message"],
        total_distance_meters=round(total_distance, 1),
        estimated_time_minutes=round(estimated_time, 1),
        avoided_surge_zones=list(avoided_zones),
        waypoints=waypoints
    )
# =====================================================================
# ADD THIS TO THE VERY BOTTOM OF YOUR routing.py FILE
# Do not change your existing /evacuate code above!
# =====================================================================

class DigitalTwinQueryRequest(BaseModel):
    # Make all possible frontend variable names optional so FastAPI doesn't throw a 422
    start: Optional[str] = None
    startZoneId: Optional[str] = None
    start_zone_id: Optional[str] = None
    zone_id: Optional[str] = None
    target: Optional[str] = "nearest"

@router.post("/query")
@router.post("/query/")
async def digital_twin_query_route(request: DigitalTwinQueryRequest):
    """
    Dedicated endpoint for the 3D Digital Twin frontend.
    Flexibly catches whatever variable name React is sending.
    """
    try:
        # Find which variable the frontend actually sent
        actual_start_id = request.start or request.startZoneId or request.start_zone_id or request.zone_id
        
        if not actual_start_id:
            return {"status": "error", "message": "Start zone ID missing from frontend payload."}

        # Use your team's existing A* pathfinder
        evac_result = pathfinder.compute_safest_evacuation(start_zone_id=actual_start_id)
        
        if evac_result.get("status") != "SUCCESS":
            return {
                "status": "error",
                "route": [],
                "message": evac_result.get("message", "Route blocked.")
            }
            
        return {
            "status": "success",
            "route": evac_result.get("path_nodes", []), # Sends the node array to the 3D map
            "message": evac_result.get("message", "Route calculated successfully.")
        }
    except Exception as e:
        return {"status": "error", "detail": str(e)}