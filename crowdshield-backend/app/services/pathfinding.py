"""Unified NetworkX Pathfinding Engine.

Uses venue_graph.json for strict physical topology and live telemetry for
dynamic A* weighting.
"""

import json
import math
import os
from typing import Any, Dict, List, Optional
import networkx as nx


class UnifiedPathfinder:

  def __init__(self, graph_file_path: str):
    self.graph = nx.DiGraph()
    self.graph_file_path = graph_file_path
    self._load_physical_topology(graph_file_path)

  def _load_physical_topology(self, path: str):
    """Loads static walls, gates, and valid physical pathways from JSON."""
    if not os.path.exists(path):
      # Fallback to look in root backend folder if relative path fails
      alt_path = os.path.join(
          os.path.dirname(__file__), "../../../venue_graph.json"
      )
      if os.path.exists(alt_path):
        path = alt_path
      else:
        print(
            "[UnifiedPathfinder] Warning: Venue graph file"
            f" {path} not found. Pathfinding will remain idle until file is"
            " present."
        )
        return

    try:
      with open(path, "r") as f:
        data = json.load(f)

      # 1. Load exact physical nodes and their coordinates
      for node in data.get("nodes", []):
        self.graph.add_node(
            node["id"],
            lat=node.get("lat", 0.0),
            lng=node.get("lng", 0.0),
            is_exit=node.get("is_exit", False),
            name=node.get("name", node["id"]),
            type=node.get("type", "zone"),
        )

      # 2. Load strictly allowed physical paths (Edges)
      for edge in data.get("edges", []):
        length = edge.get("distance_meters", edge.get("length_meters", 10.0))

        # Forward path
        self.graph.add_edge(
            edge["source"],
            edge["target"],
            base_weight=length,
            weight=length,  # Default weight before telemetry is applied
        )
        # Reverse path (Assuming bi-directional corridors unless specified)
        self.graph.add_edge(
            edge["target"],
            edge["source"],
            base_weight=length,
            weight=length,
        )

      print(
          "[UnifiedPathfinder] Physical topology loaded successfully."
          f" {self.graph.number_of_nodes()} nodes,"
          f" {self.graph.number_of_edges()} edges."
      )
    except Exception as e:
      print(f"[UnifiedPathfinder] Failed to parse venue_graph.json: {e}")

  def update_live_telemetry(self, live_zones: list):
    """Updates the physical graph with live density and risk penalties from telemetry."""
    for zone in live_zones:
      zone_id = getattr(zone, "id", None) or getattr(zone, "zone_id", None)
      if not zone_id or zone_id not in self.graph.nodes:
        continue

      density = getattr(zone, "density", 0.0)

      # Safely extract string value from Enum or raw String
      risk_obj = getattr(zone, "risk_level", "safe")
      if hasattr(risk_obj, "value"):
        risk_str = str(risk_obj.value).lower()
      else:
        risk_str = str(risk_obj).lower()

      self.graph.nodes[zone_id]["density"] = density
      self.graph.nodes[zone_id]["risk_level"] = risk_str

      # Apply dynamic penalties to any pathway leading INTO this zone
      for u, v, data in self.graph.in_edges(zone_id, data=True):
        # Exponential penalty based on crowd density
        density_multiplier = math.exp(min(density * 0.4, 10.0))

        # Additional risk penalty multiplier
        if risk_str == "critical":
          risk_bonus = 8.0
        elif risk_str in ["warning", "caution"]:
          risk_bonus = 2.5
        else:
          risk_bonus = 1.0

        # New Cost = Physical Distance * Crowd Resistance * AI Risk
        data["weight"] = data["base_weight"] * density_multiplier * risk_bonus

  def compute_safest_evacuation(
      self, start_zone_id: str, target_zone_id: Optional[str] = None
  ) -> Dict[str, Any]:
    """Calculates the optimal A* path using strictly physical edges + dynamic weights."""
    if start_zone_id not in self.graph:
      return {
          "status": "ERROR",
          "message": (
              f"Start node '{start_zone_id}' not found in venue spatial graph."
          ),
          "path_nodes": [start_zone_id],
          "cost": 0.0,
      }

    # Auto-detect exits if no specific target is provided
    if not target_zone_id:
      exits = [
          n
          for n, attr in self.graph.nodes(data=True)
          if attr.get("is_exit") and n != start_zone_id
      ]
      if not exits:
        # Fallback: Treat any node containing 'gate' or 'exit' in its ID as an exit
        exits = [
            n
            for n in self.graph.nodes
            if ("gate" in n.lower() or "exit" in n.lower())
            and n != start_zone_id
        ]
      if not exits:
        return {
            "status": "ERROR",
            "message": "No physical exits defined in venue_graph.json.",
            "path_nodes": [start_zone_id],
            "cost": 0.0,
        }
    else:
      if target_zone_id not in self.graph:
        return {
            "status": "ERROR",
            "message": f"Target exit node '{target_zone_id}' not found.",
            "path_nodes": [start_zone_id],
            "cost": 0.0,
        }
      exits = [target_zone_id]

    # A* Heuristic: Real-world physical distance estimate
    def heuristic(u, v):
      node_u = self.graph.nodes[u]
      node_v = self.graph.nodes[v]
      if (
          "lat" in node_u
          and "lng" in node_u
          and "lat" in node_v
          and "lng" in node_v
      ):
        return (
            (node_u["lat"] - node_v["lat"]) ** 2
            + (node_u["lng"] - node_v["lng"]) ** 2
        ) ** 0.5 * 111000.0
      return 0.0

    best_path = None
    best_cost = float("inf")

    # Check path to all available exits and pick the one with lowest dynamic cost
    for exit_node in exits:
      try:
        path = nx.astar_path(
            self.graph,
            start_zone_id,
            exit_node,
            heuristic=heuristic,
            weight="weight",
        )
        cost = nx.path_weight(self.graph, path, weight="weight")

        if cost < best_cost:
          best_cost = cost
          best_path = path
      except nx.NetworkXNoPath:
        continue

    if not best_path:
      return {
          "status": "BLOCKED",
          "message": (
              "All physical evacuation routes are blocked or completely choked."
          ),
          "path_nodes": [start_zone_id],
          "cost": 0.0,
      }

    target_exit_name = self.graph.nodes[best_path[-1]].get(
        "name", best_path[-1]
    )
    return {
        "status": "SUCCESS",
        "path_nodes": best_path,
        "cost": round(best_cost, 2),
        "target_exit": target_exit_name,
        "message": (
            f"Safest route locked: {' -> '.join(best_path)}. Proceed to"
            f" {target_exit_name}."
        ),
    }


# Initialize Singleton Pathfinder Instance
pathfinder_graph_path = os.path.join(
    os.path.dirname(__file__), "../../venue_graph.json"
)
pathfinder = UnifiedPathfinder(pathfinder_graph_path)