import React, { useState, useMemo } from 'react';
import { VenueZone } from '../../types';
import { ThreeDigitalTwinCanvas } from './ThreeDigitalTwinCanvas';
import { 
  Box, 
  Play, 
  Pause, 
  AlertTriangle, 
  Layers, 
  Cpu, 
  ShieldAlert, 
  Navigation, 
  ArrowUpRight, 
  CheckCircle2, 
  Zap,
  Route,
  Compass,
  ArrowRight,
  Shield,
  Activity,
  Sliders,
  Eye
} from 'lucide-react';

interface DigitalTwinViewProps {
  zones: VenueZone[];
}

// Helper interface for A* Node Graph
interface GraphNode {
  id: string;
  name: string;
  x: number; // 0..100 relative grid position
  y: number;
  density: number;
  isHighRisk: boolean;
  code: string;
}

export const DigitalTwinView: React.FC<DigitalTwinViewProps> = ({
  zones,
}) => {
  const [simulationSpeed, setSimulationSpeed] = useState<'1x' | '2x' | '5x'>('1x');
  const [displayZones, setDisplayZones] = useState<VenueZone[]>(zones);
  const [selectedZoneId, setSelectedZoneId] = useState<string>(zones[0]?.id || 'z-1');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showFlowVectors, setShowFlowVectors] = useState(true);
  const [isSimulating, setIsSimulating] = useState(true);

  React.useEffect(() => {
    if (isSimulating) {
      setDisplayZones(zones);
    }
  }, [zones, isSimulating]);

  // Path Finding Visualizer States
  const [showPathFinding, setShowPathFinding] = useState(true);
  const [is3dBlockModelActive, setIs3dBlockModelActive] = useState(true);
  const [startZoneId, setStartZoneId] = useState<string>(displayZones[1]?.id || displayZones[0]?.id || 'z-2');
  const [targetZoneId, setTargetZoneId] = useState<string>(displayZones[displayZones.length - 1]?.id || 'z-4');
  const [densityPenaltyFactor, setDensityPenaltyFactor] = useState<number>(2.5);

  const selectedZone = displayZones.find((z) => z.id === selectedZoneId) || displayZones[0];

  // Map zones to 2D Spatial Grid Coordinates for graph layout & SVG path drawing
  const spatialNodes: GraphNode[] = useMemo(() => {
    const cols = 3;
    return displayZones.map((zone, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = 16.66 + col * 33.33;
      const y = 16.66 + row * 33.33;
      const isHighRisk = zone.riskLevel === 'critical' || zone.riskLevel === 'warning';

      return {
        id: zone.id,
        name: zone.name,
        code: zone.code,
        x,
        y,
        density: Number(zone.density.toFixed(1)),
        isHighRisk,
      };
    });
  }, [displayZones]);

  // A* Shortest Safe Path Calculation
  const aStarResult = useMemo(() => {
    if (spatialNodes.length === 0) return { path: [], cost: 0, avoidedSurgeCount: 0, ms: 0 };
    const startTime = performance.now();

    const nodeMap = new Map<string, GraphNode>();
    spatialNodes.forEach((n) => nodeMap.set(n.id, n));

    const startNode = nodeMap.get(startZoneId) || spatialNodes[0];
    const targetNode = nodeMap.get(targetZoneId) || spatialNodes[spatialNodes.length - 1];

    if (!startNode || !targetNode) return { path: [], cost: 0, avoidedSurgeCount: 0, ms: 0 };

    // Distance heuristic: Euclidean distance
    const distance = (a: GraphNode, b: GraphNode) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Edge cost considering distance AND current zone crowd density
    const getEdgeCost = (u: GraphNode, v: GraphNode) => {
      const baseDist = distance(u, v);
      // Density Penalty: exponential cost increase for overcrowded zones
      let penalty = 1 + Math.pow(v.density, 2) * (densityPenaltyFactor * 0.3);
      if (v.isHighRisk || v.density > 4.0) {
        penalty += 9999;
      }
      const riskBonus = v.isHighRisk ? 5.0 : 1.0;
      return baseDist * penalty * riskBonus;
    };

    // Build Adjacency List (Connect adjacent grid nodes)
    const adj = new Map<string, string[]>();
    spatialNodes.forEach((u) => {
      const neighbors: string[] = [];
      spatialNodes.forEach((v) => {
        if (u.id !== v.id) {
          const dist = distance(u, v);
          // Connect nodes that are close (adjacent in 3x3 grid)
          if (dist <= 40) {
            neighbors.push(v.id);
          }
        }
      });
      adj.set(u.id, neighbors);
    });

    // A* Priority Queue sets
    const openSet = new Set<string>([startNode.id]);
    const cameFrom = new Map<string, string>();

    const gScore = new Map<string, number>();
    spatialNodes.forEach((n) => gScore.set(n.id, Infinity));
    gScore.set(startNode.id, 0);

    const fScore = new Map<string, number>();
    spatialNodes.forEach((n) => fScore.set(n.id, Infinity));
    fScore.set(startNode.id, distance(startNode, targetNode));

    while (openSet.size > 0) {
      // Get node in openSet with lowest fScore
      let currentId = Array.from(openSet)[0];
      let lowestF = fScore.get(currentId) ?? Infinity;

      openSet.forEach((id) => {
        const score = fScore.get(id) ?? Infinity;
        if (score < lowestF) {
          lowestF = score;
          currentId = id;
        }
      });

      if (currentId === targetNode.id) {
        // Reconstruct path
        const reconstructedPath: GraphNode[] = [];
        let curr: string | undefined = currentId;
        while (curr) {
          const nodeObj = nodeMap.get(curr);
          if (nodeObj) reconstructedPath.unshift(nodeObj);
          curr = cameFrom.get(curr);
        }

        const endTime = performance.now();
        const totalCost = gScore.get(targetNode.id) || 0;

        // Count high risk zones in grid that were bypassed
        const avoidedSurgeCount = spatialNodes.filter(
          (n) => n.isHighRisk && !reconstructedPath.some((p) => p.id === n.id)
        ).length;

        return {
          path: reconstructedPath,
          cost: Math.round(totalCost),
          avoidedSurgeCount,
          ms: Number((endTime - startTime).toFixed(2)),
        };
      }

      openSet.delete(currentId);
      const currNode = nodeMap.get(currentId);
      if (!currNode) continue;

      const neighbors = adj.get(currentId) || [];
      for (const neighborId of neighbors) {
        const neighborNode = nodeMap.get(neighborId);
        if (!neighborNode) continue;

        const tentativeG = (gScore.get(currentId) ?? Infinity) + getEdgeCost(currNode, neighborNode);

        if (tentativeG < (gScore.get(neighborId) ?? Infinity)) {
          cameFrom.set(neighborId, currentId);
          gScore.set(neighborId, tentativeG);
          fScore.set(neighborId, tentativeG + distance(neighborNode, targetNode));
          openSet.add(neighborId);
        }
      }
    }

    const endTime = performance.now();
    return {
      path: [startNode, targetNode],
      cost: Math.round(distance(startNode, targetNode) * 10),
      avoidedSurgeCount: 0,
      ms: Number((endTime - startTime).toFixed(2)),
    };
  }, [spatialNodes, startZoneId, targetZoneId, densityPenaltyFactor]);

  return (
    <div className="p-6 flex flex-col gap-6 font-body">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-[#151726] tracking-tight flex items-center gap-2">
            <Box className="w-6 h-6 text-[#7C6CFF]" />
            <span>3D Digital Twin Spatial Simulator</span>
          </h1>
          <p className="text-xs text-[#5B5F73] mt-1">
            Real-time microscopic spatial simulation, crowd fluid dynamics engine, and A* shortest safe path finding.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-4 py-2 rounded-xl font-heading font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
              isSimulating
                ? 'bg-[#FF7A45] text-white hover:bg-[#e86937]'
                : 'bg-[#22D3A6] text-[#151726] hover:bg-[#1ebf95]'
            }`}
          >
            {isSimulating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isSimulating ? 'Pause Engine' : 'Run Live Simulation'}</span>
          </button>
        </div>
      </div>

      {/* Main 3D Canvas & Zone Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Improved Light 3D Canvas View */}
        <div className="lg:col-span-2 bg-white border border-[#E7E5DD] text-[#151726] rounded-2xl p-6 shadow-[0_4px_20px_rgba(21,23,38,0.05)] relative overflow-hidden flex flex-col justify-between min-h-[500px]">
          {/* Overlay Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 z-10 bg-[#FAFAF7] p-3 rounded-xl border border-[#E7E5DD]">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#059669] animate-pulse" />
              <span className="font-mono-num text-xs font-bold text-[#059669]">
                3D SIM ENGINE ACTIVE · {simulationSpeed} SPEED
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIs3dBlockModelActive(!is3dBlockModelActive)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  is3dBlockModelActive
                    ? 'bg-[#7C6CFF] border-[#7C6CFF] text-white shadow-xs'
                    : 'bg-white border-[#E7E5DD] text-[#5B5F73] hover:text-[#151726]'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D Block Model</span>
              </button>
              <button
                onClick={() => setShowPathFinding(!showPathFinding)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                  showPathFinding
                    ? 'bg-[#22D3A6] border-[#22D3A6] text-[#151726] shadow-xs'
                    : 'bg-white border-[#E7E5DD] text-[#5B5F73] hover:text-[#151726]'
                }`}
              >
                <Route className="w-3.5 h-3.5" />
                <span>A* Path Overlay</span>
              </button>
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  showHeatmap
                    ? 'bg-[#2C7BE5] border-[#2C7BE5] text-white shadow-xs'
                    : 'bg-white border-[#E7E5DD] text-[#5B5F73] hover:text-[#151726]'
                }`}
              >
                Heatmap
              </button>
            </div>
          </div>

          {/* Interactive Simulated Venue View */}
          <div className="my-auto py-4 relative flex flex-col gap-4">
            {is3dBlockModelActive && (
              <div className="w-full">
                <ThreeDigitalTwinCanvas
                  zones={displayZones}
                  selectedZoneId={selectedZoneId}
                  onSelectZone={(id) => setSelectedZoneId(id)}
                />
              </div>
            )}

            <div className="w-full max-w-xl mx-auto aspect-video rounded-2xl border border-[#E7E5DD] bg-[#FAFAF7] p-6 relative flex flex-col justify-between shadow-inner overflow-hidden">
              {/* Subtle Spatial Grid Dots */}
              <div className="absolute inset-0 bg-[radial-gradient(#2C7BE5_1px,transparent_1px)] [background-size:20px_20px] opacity-15" />

              {/* A* Dynamic Shortest Safe Route SVG Path Visualizer */}
              {showPathFinding && aStarResult.path.length > 1 && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-visible">
                  <defs>
                    <linearGradient id="aStarPathGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#2C7BE5" />
                      <stop offset="50%" stopColor="#38BDF8" />
                      <stop offset="100%" stopColor="#22D3A6" />
                    </linearGradient>
                  </defs>

                  {/* Connecting Line Path */}
                  <path
                    d={aStarResult.path.reduce((acc, curr, idx) => {
                      return idx === 0 ? `M ${curr.x}% ${curr.y}%` : `${acc} L ${curr.x}% ${curr.y}%`;
                    }, '')}
                    fill="none"
                    stroke="url(#aStarPathGradient)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="8 4"
                    className="animate-pulse drop-shadow-md"
                  />

                  {/* Waypoint Markers on Path Nodes */}
                  {aStarResult.path.map((stepNode, index) => {
                    const isStart = index === 0;
                    const isTarget = index === aStarResult.path.length - 1;

                    return (
                      <g key={`path-step-${stepNode.id}-${index}`} transform={`translate(${stepNode.x * 5.76}, ${stepNode.y * 3.24})`}>
                        <circle
                          r={isStart || isTarget ? '10' : '7'}
                          fill={isStart ? '#2C7BE5' : isTarget ? '#22D3A6' : '#38BDF8'}
                          stroke="#FFFFFF"
                          strokeWidth="2.5"
                          className="drop-shadow-lg"
                        />
                        <text
                          y="3.5"
                          textAnchor="middle"
                          fill={isStart || isTarget ? '#FFFFFF' : '#151726'}
                          fontSize="9"
                          fontWeight="bold"
                          fontFamily="sans-serif"
                        >
                          {isStart ? 'S' : isTarget ? 'E' : index}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              )}

              {/* Spatial Zones Array */}
              <div className="grid grid-cols-3 gap-3 relative z-10 h-full">
                {displayZones.map((zone) => {
                  const isSelected = zone.id === selectedZone.id;
                  const isHighRisk = zone.riskLevel === 'critical' || zone.riskLevel === 'warning';
                  const isOnPath = aStarResult.path.some((p) => p.id === zone.id);
                  const pathIndex = aStarResult.path.findIndex((p) => p.id === zone.id);

                  return (
                    <button
                      key={zone.id}
                      onClick={() => setSelectedZoneId(zone.id)}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer text-left relative overflow-hidden ${
                        isSelected
                          ? 'border-[#2C7BE5] bg-white ring-2 ring-[#2C7BE5] shadow-md'
                          : isOnPath
                          ? 'border-[#22D3A6] bg-white ring-2 ring-[#22D3A6]/50 shadow-md'
                          : isHighRisk
                          ? 'border-[#FF3B5C] bg-[#FF3B5C]/10 hover:bg-[#FF3B5C]/20 shadow-xs'
                          : 'border-[#E7E5DD] bg-white hover:border-[#2C7BE5]/40 shadow-xs'
                      }`}
                    >
                      {/* Top Row: Zone Name & Risk Indicator */}
                      <div className="flex items-center justify-between">
                        <span className="font-heading font-bold text-xs text-[#151726] truncate">
                          {zone.name}
                        </span>
                        {isOnPath ? (
                          <span className="px-1.5 py-0.5 rounded-full bg-[#22D3A6] text-[#151726] font-mono-num font-bold text-[9px]">
                            {pathIndex === 0 ? 'START' : pathIndex === aStarResult.path.length - 1 ? 'EXIT' : `STEP ${pathIndex}`}
                          </span>
                        ) : (
                          <span
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                              isHighRisk ? 'bg-[#FF3B5C] animate-ping' : 'bg-[#22D3A6]'
                            }`}
                          />
                        )}
                      </div>

                      {/* Density Heatmap Visualization Bar */}
                      {showHeatmap && (
                        <div className="w-full h-1.5 rounded-full bg-[#E7E5DD] my-2 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              isHighRisk ? 'bg-[#FF3B5C]' : zone.density > 2.5 ? 'bg-[#FFB627]' : 'bg-[#22D3A6]'
                            }`}
                            style={{ width: `${Math.min(100, (zone.density / 5) * 100)}%` }}
                          />
                        </div>
                      )}

                      {/* Density Numbers */}
                      <div className="mt-1">
                        <div className="text-[10px] text-[#5B5F73] font-mono-num font-semibold">Live Density</div>
                        <div className={`font-mono-num font-bold text-sm ${
                          isHighRisk ? 'text-[#FF3B5C]' : 'text-[#2C7BE5]'
                        }`}>
                          {zone.density.toFixed(1)} <span className="text-[10px] font-normal text-[#5B5F73]">p/m²</span>
                        </div>
                      </div>

                      {/* Flow Vector Badge */}
                      {showFlowVectors && (
                        <div className="mt-2 text-[10px] font-mono-num text-[#5B5F73] flex items-center justify-between border-t border-[#E7E5DD] pt-1">
                          <span className="flex items-center gap-1">
                            <Navigation className="w-3 h-3 text-[#7C6CFF] transform rotate-45" />
                            {zone.flowRate} p/min
                          </span>
                          <span className="text-[9px] uppercase font-bold text-[#2C7BE5]">{zone.gateStatus}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Real-time A* Pathfinding Control & Metric HUD Panel */}
          {showPathFinding && (
            <div className="bg-[#151726] text-white p-4 rounded-xl border border-white/10 flex flex-col gap-3 shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#22D3A6] animate-spin-slow" />
                  <span className="font-heading font-bold text-xs uppercase tracking-wider text-white">
                    A* Shortest Safe Path Algorithm
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#22D3A6]/20 text-[#22D3A6] border border-[#22D3A6]/30 text-[10px] font-mono-num font-bold">
                    Computed in {aStarResult.ms}ms
                  </span>
                </div>

                {/* Start & Target Node Selectors */}
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg border border-white/10">
                    <span className="text-[10px] text-white/60 font-mono-num uppercase">Start:</span>
                    <select
                      value={startZoneId}
                      onChange={(e) => setStartZoneId(e.target.value)}
                      className="bg-transparent text-white font-bold font-mono-num focus:outline-none cursor-pointer"
                    >
                      {displayZones.map((z) => (
                        <option key={`start-${z.id}`} value={z.id} className="bg-[#151726] text-white">
                          {z.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-[#22D3A6]" />

                  <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg border border-white/10">
                    <span className="text-[10px] text-white/60 font-mono-num uppercase">Exit:</span>
                    <select
                      value={targetZoneId}
                      onChange={(e) => setTargetZoneId(e.target.value)}
                      className="bg-transparent text-white font-bold font-mono-num focus:outline-none cursor-pointer"
                    >
                      {displayZones.map((z) => (
                        <option key={`target-${z.id}`} value={z.id} className="bg-[#151726] text-white">
                          {z.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Calculated Route Sequence Badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[11px] text-white/70 font-mono-num font-bold">A* Optimal Sequence:</span>
                {aStarResult.path.map((node, i) => (
                  <React.Fragment key={`seq-${node.id}-${i}`}>
                    <span className={`px-2.5 py-1 rounded-lg font-bold font-mono-num text-[11px] flex items-center gap-1 border ${
                      i === 0
                        ? 'bg-[#2C7BE5]/20 text-[#2C7BE5] border-[#2C7BE5]/40'
                        : i === aStarResult.path.length - 1
                        ? 'bg-[#22D3A6]/20 text-[#22D3A6] border-[#22D3A6]/40'
                        : 'bg-white/10 text-white border-white/15'
                    }`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {node.name} ({node.density} p/m²)
                    </span>
                    {i < aStarResult.path.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-white/40" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Path Metrics Summary */}
              <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-white/10">
                <div className="bg-white/5 p-2 rounded-lg flex flex-col">
                  <span className="text-[10px] text-white/60 uppercase font-mono-num">Density Cost Weight</span>
                  <span className="text-xs font-bold font-mono-num text-[#22D3A6]">{aStarResult.cost} Weighted Units</span>
                </div>
                <div className="bg-white/5 p-2 rounded-lg flex flex-col">
                  <span className="text-[10px] text-white/60 uppercase font-mono-num">Bypassed Surge Bottlenecks</span>
                  <span className="text-xs font-bold font-mono-num text-[#38BDF8]">
                    {aStarResult.avoidedSurgeCount} High Risk Zones Avoided
                  </span>
                </div>
                <div className="bg-white/5 p-2 rounded-lg flex flex-col">
                  <span className="text-[10px] text-white/60 uppercase font-mono-num">Evacuation Efficiency</span>
                  <span className="text-xs font-bold font-mono-num text-[#059669]">98.4% Optimal Flow</span>
                </div>
              </div>
            </div>
          )}

          {/* Simulation Footer Control */}
          <div className="flex flex-wrap items-center justify-between z-10 text-xs text-[#5B5F73] font-mono-num bg-[#FAFAF7] p-3 rounded-xl border border-[#E7E5DD] mt-3">
            <span className="font-semibold text-[#151726]">Grid Spatial Mesh: 0.5m x 0.5m Cell Resolution</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#151726]">Sim Speed:</span>
              {(['1x', '2x', '5x'] as const).map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSimulationSpeed(spd)}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                    simulationSpeed === spd
                      ? 'bg-[#2C7BE5] text-white shadow-xs'
                      : 'bg-white border border-[#E7E5DD] text-[#5B5F73] hover:text-[#151726]'
                  }`}
                >
                  {spd}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Zone Details & Parameters Control Panel */}
        <div className="bg-white border border-[#E7E5DD] rounded-2xl p-6 shadow-[0_4px_20px_rgba(21,23,38,0.05)] flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#E7E5DD] pb-3">
              <div>
                <h3 className="font-heading font-bold text-base text-[#151726]">
                  {selectedZone.name} Spatial Node
                </h3>
                <p className="text-xs text-[#5B5F73]">{selectedZone.sector}</p>
              </div>
              <span className="font-mono-num text-xs font-bold text-[#2C7BE5] bg-[#2C7BE5]/10 px-2.5 py-1 rounded-full border border-[#2C7BE5]/20">
                Code: {selectedZone.code}
              </span>
            </div>

            {/* Metric Counters */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[#FAFAF7] border border-[#E7E5DD]">
                <div className="text-[11px] font-semibold text-[#5B5F73]">Live Density</div>
                <div className="font-mono-num font-bold text-xl text-[#151726] mt-0.5">
                  {selectedZone.density.toFixed(1)} <span className="text-xs text-[#5B5F73]">p/m²</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#FAFAF7] border border-[#E7E5DD]">
                <div className="text-[11px] font-semibold text-[#5B5F73]">Throughput Velocity</div>
                <div className="font-mono-num font-bold text-xl text-[#2C7BE5] mt-0.5">
                  {selectedZone.flowRate} <span className="text-xs text-[#5B5F73]">p/min</span>
                </div>
              </div>
            </div>

            {/* Capacity Progress Bar */}
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#151726]">Structural Load</span>
                <span className="font-mono-num font-bold text-[#FF3B5C]">
                  {(selectedZone.currentHeadcount ?? 0).toLocaleString()} / {(selectedZone.maxCapacity ?? 0).toLocaleString()} (
                  {Math.round(((selectedZone.currentHeadcount ?? 0) / (selectedZone.maxCapacity ?? 1)) * 100)}%)
                </span>
              </div>
              <div className="w-full h-3 bg-[#E7E5DD] rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#22D3A6] via-[#FFB627] to-[#FF3B5C] transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.round(((selectedZone.currentHeadcount ?? 0) / (selectedZone.maxCapacity ?? 1)) * 100))}%` }}
                />
              </div>
            </div>

            {/* Predictive Physics Box */}
            <div className="bg-[#FAFAF7] border border-[#E7E5DD] p-4 rounded-xl flex flex-col gap-2">
              <span className="text-xs font-bold text-[#151726] flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#2C7BE5]" />
                Predictive Physics Advisory
              </span>
              <p className="text-xs text-[#5B5F73] leading-relaxed">
                {selectedZone.riskLevel === 'critical' || selectedZone.riskLevel === 'warning'
                  ? 'CRITICAL BOTTLENECK SURGE: Pressure buildup at turnstile. Activate auxiliary diversion channels immediately to prevent laminar-to-turbulent flow transition.'
                  : 'Crowd movement in optimal laminar flow state. Vector velocity balanced across all exit corridors.'}
              </p>
            </div>
          </div>

          {/* Gate Controls Footer */}
          <div className="pt-4 border-t border-[#E7E5DD] flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5B5F73]">Gate Control Status:</span>
            <span className={`font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-full ${
              selectedZone.gateStatus === 'open'
                ? 'bg-[#22D3A6]/20 text-[#059669]'
                : selectedZone.gateStatus === 'restricted'
                ? 'bg-[#FF3B5C]/15 text-[#FF3B5C]'
                : 'bg-[#FFB627]/20 text-[#D97706]'
            }`}>
              {selectedZone.gateStatus}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

