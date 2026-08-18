import json
import os
from typing import Dict

def load_graph_edges(graph_file_path: str):
    if not os.path.exists(graph_file_path):
        return []
    with open(graph_file_path, 'r') as f:
        data = json.load(f)
    return data.get("edges", [])

def aggregate_headcounts(zone_headcounts: Dict[str, int], graph_file_path: str) -> int:
    """
    Aggregates headcount across multiple zones and applies multi-camera overlap deduplication.
    Formula: Total Headcount = sum(Zone Headcounts) - sum(Overlap Ratios * Adjacent Headcounts)
    """
    edges = load_graph_edges(graph_file_path)
    
    total_raw = sum(zone_headcounts.values())
    total_overlap = 0.0
    for edge in edges:
        source = edge.get("source")
        target = edge.get("target")
        ratio = edge.get("overlap_ratio", 0.0)
        
        if ratio > 0.0 and source in zone_headcounts and target in zone_headcounts:

            adjacent_headcount = min(zone_headcounts[source], zone_headcounts[target])
            total_overlap += (ratio * adjacent_headcount)

    deduplicated_total = max(0, int(total_raw - total_overlap))
    return deduplicated_total
