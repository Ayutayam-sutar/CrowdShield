"""
Unified NetworkX Pathfinding Engine.
Uses venue_graph.json for strict physical topology and SQLite live zones for dynamic A* weighting.
"""
import json
import os
import math
import networkx as nx
from typing import List, Dict, Any, Optional

class UnifiedPathfinder:
    def __init__(self, graph_file_path: str):
        self.graph = nx.DiGraph()
        self._load_physical_topology(graph_file_path)

    def _load_physical_topology(self, path: str):
        """Loads static walls, gates, and valid physical pathways from JSON."""
        if not os.path.exists(path):
            print(f"[UnifiedPathfinder] Warning: Venue graph file {path} not found.")
            return

        with open(path, 'r') as f:
            data = json.load(f)
            
        # 1. Load exact physical nodes and their coordinates
        for node in data.get("nodes", []):
            self.graph.add_node(
                node["id"], 
                lat=node.get("lat", 0.0), 
                lng=node.get("lng", 0.0),
                is_exit=node.get("is_exit", False),
                name=node.get("name", node["id"])
            )
            
        # 2. Load strictly allowed physical paths (Edges)
        for edge in data.get("edges", []):
            length = edge.get("length_meters", 10.0)
            
            # Forward path
            self.graph.add_edge(
                edge["source"], edge["target"], 
                base_weight=length,
                weight=length  # Default weight before telemetry is applied
            )
            # Reverse path (Assuming bi-directional corridors unless specified)
            self.graph.add_edge(
                edge["target"], edge["source"], 
                base_weight=length,
                weight=length
            )
        print(f"[UnifiedPathfinder] Physical topology loaded. {self.graph.number_of_nodes()} nodes, {self.graph.number_of_edges()} edges.")

    def update_live_telemetry(self, live_zones: list):
        """Updates the physical graph with live density and risk penalties from the DB."""
        for zone in live_zones:
            if zone.id in self.graph.nodes:
                self.graph.nodes[zone.id]['density'] = zone.density
                self.graph.nodes[zone.id]['risk_level'] = zone.risk_level.value
                
                # Apply dynamic penalties to any pathway leading INTO this zone
                for u, v, data in self.graph.in_edges(zone.id, data=True):
                    # Exponential penalty based on crowd density
                    # Capped at 10 to prevent math overflow errors during extreme surges
                    density_multiplier = math.exp(min(zone.density * 0.4, 10))
                    
                    # 5x penalty if the ML engine flagged it as critical
                    risk_bonus = 5.0 if zone.risk_level.value == 'critical' else 1.0
                    
                    # New Cost = Physical Distance * Crowd Resistance * AI Risk
                    data['weight'] = data['base_weight'] * density_multiplier * risk_bonus

    def compute_safest_evacuation(self, start_zone_id: str, target_zone_id: Optional[str] = None) -> Dict[str, Any]:
        """Calculates the optimal A* path using strictly physical edges + dynamic weights."""
        if start_zone_id not in self.graph:
            return {"status": "ERROR", "message": f"Start node {start_zone_id} not found in physical graph."}

        # Auto-detect exits if no specific target is provided
        if not target_zone_id:
            exits = [n for n, attr in self.graph.nodes(data=True) if attr.get("is_exit") and n != start_zone_id]
            if not exits:
                return {"status": "ERROR", "message": "No physical exits defined in venue_graph.json."}
        else:
            if target_zone_id not in self.graph:
                return {"status": "ERROR", "message": f"Target node {target_zone_id} not found."}
            exits = [target_zone_id]

        # A* Heuristic: Real-world physical distance estimate to the exit
        def heuristic(u, v):
            node_u = self.graph.nodes[u]
            node_v = self.graph.nodes[v]
            if 'lat' in node_u and 'lng' in node_u and 'lat' in node_v and 'lng' in node_v:
                # Approximate degrees to meters
                return ((node_u['lat'] - node_v['lat'])**2 + (node_u['lng'] - node_v['lng'])**2)**0.5 * 111000
            return 0.0

        best_path = None
        best_cost = float('inf')

        # Check path to all available exits and pick the one with the lowest total dynamic cost
        for exit_node in exits:
            try:
                path = nx.astar_path(self.graph, start_zone_id, exit_node, heuristic=heuristic, weight='weight')
                cost = nx.path_weight(self.graph, path, weight='weight')
                
                if cost < best_cost:
                    best_cost = cost
                    best_path = path
            except nx.NetworkXNoPath:
                continue

        if not best_path:
            return {
                "status": "BLOCKED",
                "message": "All physical evacuation routes are blocked or completely choked.",
                "path_nodes": [],
                "cost": 0.0
            }

        target_exit_name = self.graph.nodes[best_path[-1]].get("name", best_path[-1])
        return {
            "status": "SUCCESS",
            "path_nodes": best_path,
            "cost": best_cost,
            "target_exit": target_exit_name,
            "message": f"Safest route locked. Proceed to {target_exit_name}."
        }

# Instantiate Singleton to be used across FastAPI routers
# Assumes venue_graph.json is in the root directory relative to this service
pathfinder = UnifiedPathfinder(os.path.join(os.path.dirname(__file__), "../../venue_graph.json"))