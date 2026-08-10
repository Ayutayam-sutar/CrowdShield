/**
 * Shared venue topology for the Digital Twin (2D SVG view and 3D canvas view).
 *
 * IMPORTANT: this is NOT mock/invented data. The x/y values below are a
 * direct 2D screen-space projection of the REAL latitude/longitude values
 * in your backend's venue_graph.json - screens can't render raw GPS
 * coordinates usefully, so this file does the one-time conversion:
 *
 *   x = (lng - minLng) / (maxLng - minLng) * 80 + 10   // 10-90 range
 *   y = (maxLat - lat) / (maxLat - minLat) * 80 + 10   // inverted so north is up
 *
 * Source coordinates (copied verbatim from venue_graph.json):
 *   gate_1:                  lat 20.251200, lng 85.801800
 *   zone_admin_block_rd:     lat 20.250300, lng 85.800800
 *   zone_library_roundabout: lat 20.249400, lng 85.800000
 *   zone_sports_complex_rd:  lat 20.248000, lng 85.799000
 *   gate_2:                  lat 20.247200, lng 85.798300
 *   zone_e_block_lawn_rd:    lat 20.248800, lng 85.800800
 *
 * If you edit venue_graph.json (e.g. once you get more accurate GPS via
 * Google Maps "What's here?"), re-run the same formula and update the x/y
 * values below to match. Everything else in this file (edges, helper
 * functions) stays the same regardless of coordinates.
 */

export interface TopologyNode {
  id: string;
  name: string;
  shortLabel: string;
  x: number; // derived from real lng, see formula above
  y: number; // derived from real lat, see formula above
  isGate: boolean;
  isExit: boolean;
}

export interface TopologyEdge {
  source: string;
  target: string;
}

export const VENUE_TOPOLOGY: TopologyNode[] = [
  { id: 'gate_1', name: 'Main Gate', shortLabel: 'Gate 1', x: 90.0, y: 10.0, isGate: true, isExit: true },
  { id: 'zone_admin_block_rd', name: 'Administrative Block Road', shortLabel: 'Admin Rd', x: 67.1, y: 28.0, isGate: false, isExit: false },
  { id: 'zone_library_roundabout', name: 'Central Library Roundabout', shortLabel: 'Roundabout', x: 48.9, y: 46.0, isGate: false, isExit: false },
  { id: 'zone_sports_complex_rd', name: 'Sports Complex / Physics Dept Road', shortLabel: 'Sports Rd', x: 26.0, y: 74.0, isGate: false, isExit: false },
  { id: 'gate_2', name: 'EV Charging / Food Court Junction', shortLabel: 'Gate 2', x: 10.0, y: 90.0, isGate: true, isExit: true },
  { id: 'zone_e_block_lawn_rd', name: 'E Block Lawn / F Block Road', shortLabel: 'E Block Rd', x: 67.1, y: 58.0, isGate: false, isExit: false },
];

// Must match the "edges" array in venue_graph.json exactly - keep in sync.
export const VENUE_EDGES: TopologyEdge[] = [
  { source: 'gate_1', target: 'zone_admin_block_rd' },
  { source: 'zone_admin_block_rd', target: 'zone_library_roundabout' },
  { source: 'zone_library_roundabout', target: 'zone_sports_complex_rd' },
  { source: 'zone_sports_complex_rd', target: 'gate_2' },
  { source: 'gate_2', target: 'zone_e_block_lawn_rd' },
  { source: 'zone_e_block_lawn_rd', target: 'zone_library_roundabout' },
];

export function getTopologyNode(id: string): TopologyNode | undefined {
  return VENUE_TOPOLOGY.find((n) => n.id === id);
}

// Unweighted adjacency, used ONLY as a visual fallback when no live
// evacuationRoute has arrived yet from the backend. This is explicitly NOT
// the real AI-weighted route - the UI labels it as a fallback whenever shown.
export function buildAdjacency(): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  VENUE_TOPOLOGY.forEach((n) => adj.set(n.id, []));
  VENUE_EDGES.forEach((e) => {
    adj.get(e.source)?.push(e.target);
    adj.get(e.target)?.push(e.source);
  });
  return adj;
}

export function fallbackShortestPath(startId: string, targetId: string): string[] {
  const adj = buildAdjacency();
  if (!adj.has(startId) || !adj.has(targetId)) return [];
  if (startId === targetId) return [startId];

  const visited = new Set<string>([startId]);
  const queue: string[][] = [[startId]];

  while (queue.length > 0) {
    const path = queue.shift()!;
    const last = path[path.length - 1];
    for (const neighbor of adj.get(last) || []) {
      if (neighbor === targetId) return [...path, neighbor];
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  return [];
}

export function nearestExit(startId: string): string | null {
  const adj = buildAdjacency();
  if (!adj.has(startId)) return null;
  const exits = VENUE_TOPOLOGY.filter((n) => n.isExit && n.id !== startId).map((n) => n.id);
  if (exits.length === 0) return null;

  let best: string | null = null;
  let bestLen = Infinity;
  for (const exitId of exits) {
    const path = fallbackShortestPath(startId, exitId);
    if (path.length > 0 && path.length < bestLen) {
      bestLen = path.length;
      best = exitId;
    }
  }
  return best;
}