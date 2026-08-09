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
async def compute_evacuation_route(request: RoutingRequest, db: AsyncSession = Depends(get_db)):
    """
    Computes the safest A* evacuation path using physical JSON topology + DB telemetry penalties.
    """
    result = await db.execute(select(Zone).where(Zone.venue_id == request.venue_id))
    zones = result.scalars().all()
    
    if not zones:
        raise HTTPException(status_code=404, detail="No live zones found for venue in database")
        
    # 1. Update the physical graph with live telemetry
    pathfinder.update_live_telemetry(zones)

    # 2. Find the nearest valid physical zone to the user's GPS coordinates
    start_zone = None
    min_dist = float('inf')
    for z in zones:
        dist = ((z.center_lat - request.current_lat)**2 + (z.center_lng - request.current_lng)**2)**0.5
        if dist < min_dist:
            min_dist = dist
            start_zone = z
            
    if not start_zone or start_zone.id not in pathfinder.graph:
        raise HTTPException(status_code=400, detail="Could not snap your location to a valid physical zone.")

    # 3. Calculate safest path to an exit
    evac_result = pathfinder.compute_safest_evacuation(start_zone.id)
    
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

    # 4. Construct response metrics and waypoints
    waypoints = []
    avoided_zones = set()
    total_distance = 0.0
    
    prev_node = None
    for node_id in path_nodes:
        node_data = pathfinder.graph.nodes[node_id]
        
        waypoints.append(Waypoint(
            lat=node_data.get('lat', 0.0),
            lng=node_data.get('lng', 0.0),
            zone_name=node_data.get('name', f"Zone {node_id}")
        ))
        
        if prev_node:
            # Reconstruct the base physical distance from the graph edges
            edge_data = pathfinder.graph.get_edge_data(prev_node, node_id, {})
            total_distance += edge_data.get('base_weight', 10.0)
            
        prev_node = node_id

    # Find which critical zones the A* algorithm successfully bypassed
    critical_zones = [z for z in zones if z.risk_level.value == 'critical']
    for cz in critical_zones:
        if cz.id not in path_nodes:
            avoided_zones.add(cz.name)

    # Assume standard evacuation walking speed (1.2 m/s or 72 m/min)
    estimated_time = total_distance / 72.0

    return RoutingResponse(
        status="SUCCESS",
        message=evac_result["message"],
        total_distance_meters=round(total_distance, 1),
        estimated_time_minutes=round(estimated_time, 1),
        avoided_surge_zones=list(avoided_zones),
        waypoints=waypoints
    )