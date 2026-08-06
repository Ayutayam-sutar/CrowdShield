"""
Routing endpoint for A* Evacuation Path Computation.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Dict, Any

from app.db.session import get_db
from app.models.venue import Zone
from app.services.pathfinding import pathfinder
from app.api.deps import get_current_active_admin

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
    total_distance_meters: float
    estimated_time_minutes: float
    avoided_surge_zones: List[str]
    waypoints: List[Waypoint]

@router.post("/evacuate", response_model=RoutingResponse)
async def compute_evacuation_route(request: RoutingRequest, db: AsyncSession = Depends(get_db)):
    """
    Computes the safest A* evacuation path considering density penalties.
    """
    result = await db.execute(select(Zone).where(Zone.venue_id == request.venue_id))
    zones = result.scalars().all()
    
    if not zones:
        raise HTTPException(status_code=404, detail="No zones found for venue")
        
    pathfinder.build_graph(zones)

    # Find the nearest zone to the user's current location
    start_zone = None
    min_dist = float('inf')
    for z in zones:
        dist = ((z.center_lat - request.current_lat)**2 + (z.center_lng - request.current_lng)**2)**0.5
        if dist < min_dist:
            min_dist = dist
            start_zone = z
            
    if not start_zone:
        raise HTTPException(status_code=400, detail="Could not determine start zone")

    # Find target safe exit (e.g. Gate 4, or just the safest outer zone)
    # For now, let's just pick 'z-4' (Gate 4) if it exists, otherwise the last zone
    end_zone_id = "z-4"
    if not any(z.id == end_zone_id for z in zones):
        end_zone_id = zones[-1].id

    path_nodes = pathfinder.find_safest_path(start_zone.id, end_zone_id)
    
    if not path_nodes:
        # Fallback empty response
        return RoutingResponse(
            total_distance_meters=0.0,
            estimated_time_minutes=0.0,
            avoided_surge_zones=[],
            waypoints=[]
        )

    # Construct waypoints
    waypoints = []
    avoided_zones = set()
    total_distance = 0.0
    
    prev_node = None
    for i, node_id in enumerate(path_nodes):
        node_data = pathfinder.graph.nodes[node_id]
        zone_obj = next((z for z in zones if z.id == node_id), None)
        zone_name = zone_obj.name if zone_obj else f"Zone {node_id}"
        
        waypoints.append(Waypoint(
            lat=node_data['lat'],
            lng=node_data['lng'],
            zone_name=zone_name
        ))
        
        if prev_node:
            # calculate distance (very rough approximation for meters)
            lat_diff = node_data['lat'] - pathfinder.graph.nodes[prev_node]['lat']
            lng_diff = node_data['lng'] - pathfinder.graph.nodes[prev_node]['lng']
            dist_deg = (lat_diff**2 + lng_diff**2)**0.5
            total_distance += dist_deg * 111000 # Approx meters per degree
            
        prev_node = node_id

    # Check for avoided zones: Any zone not in path that is critical
    critical_zones = [z for z in zones if z.risk_level.value == 'critical']
    for cz in critical_zones:
        if cz.id not in path_nodes:
            avoided_zones.add(cz.name)

    # Assuming average walking speed of 1.2 m/s (72 m/min)
    estimated_time = total_distance / 72.0

    return RoutingResponse(
        total_distance_meters=round(total_distance, 1),
        estimated_time_minutes=round(estimated_time, 1),
        avoided_surge_zones=list(avoided_zones),
        waypoints=waypoints
    )
