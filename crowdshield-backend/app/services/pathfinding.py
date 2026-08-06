"""
A* Pathfinding Algorithm using NetworkX for safe evacuation routing.
"""

import networkx as nx
from typing import List

class PathfindingService:
    def __init__(self):
        # In a real app, this graph is built from venue zones and physical connections.
        # Here we initialize an empty graph that will be built per request or cached.
        self.graph = nx.Graph()

    def build_graph(self, zones: list):
        """
        Constructs the venue graph based on active zones.
        """
        self.graph.clear()
        for zone in zones:
            self.graph.add_node(zone.id, density=zone.density, risk_level=zone.risk_level.value, lat=zone.center_lat, lng=zone.center_lng)
            
        # Mock connections between zones based on distance for this example.
        # In reality, this should be based on real venue topology.
        for z1 in zones:
            for z2 in zones:
                if z1.id != z2.id:
                    # Calculate euclidean distance (very naive representation)
                    dist = ((z1.center_lat - z2.center_lat)**2 + (z1.center_lng - z2.center_lng)**2)**0.5
                    if dist < 0.005: # roughly 500 meters
                        self.graph.add_edge(z1.id, z2.id, weight=dist)

    def find_safest_path(self, start_zone_id: str, end_zone_id: str) -> List[str]:
        """
        Uses A* to find the safest path, applying exponential cost penalties 
        to zones with high density or critical status.
        """
        def heuristic(u, v):
            node_u = self.graph.nodes[u]
            node_v = self.graph.nodes[v]
            return ((node_u['lat'] - node_v['lat'])**2 + (node_u['lng'] - node_v['lng'])**2)**0.5

        def weight_func(u, v, d):
            base_cost = d['weight']
            node_v = self.graph.nodes[v]
            density = node_v.get('density', 0.0)
            status = node_v.get('risk_level', 'safe')

            # weight = distance * math.exp(density * 0.4) * (5.0 if risk_level == 'critical' else 1.0)
            import math
            multiplier = math.exp(density * 0.4)
            risk_bonus = 5.0 if status == 'critical' else 1.0

            return base_cost * multiplier * risk_bonus

        try:
            path = nx.astar_path(self.graph, start_zone_id, end_zone_id, heuristic=heuristic, weight=weight_func)
            return path
        except nx.NetworkXNoPath:
            return []

pathfinder = PathfindingService()
