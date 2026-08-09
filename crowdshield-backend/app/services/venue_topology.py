"""
NetworkX Routing Engine for dynamic spatial topology and evacuation pathfinding.
"""
import json
import os
import networkx as nx
from typing import List, Dict, Any

class VenueTopologyEngine:
    def __init__(self, graph_file_path: str):
        self.graph = nx.DiGraph()
        self.nodes = {}
        self._load_graph(graph_file_path)

    def _load_graph(self, path: str):
        if not os.path.exists(path):
            print(f"Warning: Venue graph file {path} not found.")
            return

        with open(path, 'r') as f:
            data = json.load(f)
            
        for node in data.get("nodes", []):
            self.nodes[node["id"]] = node
            self.graph.add_node(node["id"], **node)
            
        for edge in data.get("edges", []):
            self.graph.add_edge(
                edge["source"], 
                edge["target"], 
                length_meters=edge["length_meters"],
                max_flow_rate=edge["max_flow_rate"]
            )
            # Add reverse edge for bidirectionality unless strictly one-way
            self.graph.add_edge(
                edge["target"], 
                edge["source"], 
                length_meters=edge["length_meters"],
                max_flow_rate=edge["max_flow_rate"]
            )

    def calculate_evacuation_path(self, source_node_id: str, live_densities: Dict[str, float], critical_threshold: float = 4.0):
        """
        Calculates optimal evacuation path applying dynamic cost weighting based on live density.
        """
        if source_node_id not in self.graph:
            return {"error": "Source node not found in graph"}

        # Update dynamic weights
        for u, v, data in self.graph.edges(data=True):
            # We look at the target node density to determine the cost of moving to it
            target_density = live_densities.get(v, 0.0)
            
            if target_density >= critical_threshold:
                weight = 99999.0
            else:
                length = data.get("length_meters", 10.0)
                # Weight = Length * (1.0 + (Live Density / Critical Threshold)^3)
                weight = length * (1.0 + (target_density / critical_threshold)**3)
                
            self.graph[u][v]['weight'] = weight

        # Find the best exit
        exits = [n for n, attr in self.nodes.items() if attr.get("is_exit") and n != source_node_id]
        if not exits:
            return {"error": "No exits defined in graph"}

        best_path = None
        best_cost = float('inf')

        for exit_node in exits:
            try:
                # Use Dijkstra/A* via astar_path (defaults to Dijkstra without heuristic)
                path = nx.astar_path(self.graph, source_node_id, exit_node, weight='weight')
                cost = nx.path_weight(self.graph, path, weight='weight')
                
                if cost < best_cost:
                    best_cost = cost
                    best_path = path
            except nx.NetworkXNoPath:
                continue

        if not best_path or best_cost >= 99999.0:
            return {
                "status": "BLOCKED",
                "message": "All primary evacuation routes are currently choked or critical.",
                "path": None
            }

        target_exit_name = self.nodes[best_path[-1]].get("name", best_path[-1])
        recommendation = f"Reroute inflow from Node [{source_node_id}] to Auxiliary Node [{best_path[-1]}]. Unlock {target_exit_name} turnstiles."

        return {
            "status": "SUCCESS",
            "optimal_path": best_path,
            "cost": best_cost,
            "recommendation": recommendation,
            "target_exit": target_exit_name
        }

# Instantiate a singleton to be used across the app
venue_topology_engine = VenueTopologyEngine(os.path.join(os.path.dirname(__file__), "../../venue_graph.json"))
