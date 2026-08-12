import React, { useState, useMemo, useEffect } from 'react';
import { VenueZone,VenueInfo } from '../../types';
import { ThreeDigitalTwinCanvas } from './ThreeDigitalTwinCanvas';
import {
  VENUE_TOPOLOGY,
  VENUE_EDGES,
  getTopologyNode,
  fallbackShortestPath,
  nearestExit,
} from '../../data/venueTopology';
import api from '../../utils/api';
import {
  Box,
  Cpu,
  Route,
  Compass,
  ArrowRight,
  Zap,
  DoorOpen,
  CircleDot,
  Loader2,
  Search,
} from 'lucide-react';

interface DigitalTwinViewProps {
  zones: any[]; // Or VenueZone[] depending on your types
  selectedVenue?: VenueInfo | null; 
}

interface QueriedRoute {
  status: 'SUCCESS' | 'BLOCKED' | 'ERROR';
  message: string;
  path_nodes: string[];
  cost: number;
  target_exit?: string;
}

// ADD activeNodes: any[] to the parameters here!
export function useMergedNodes(zones: any[], activeNodes: any[]) {
  return useMemo(() => {
    const byId = new Map(zones.map((z: any) => [z.id, z]));
    return activeNodes.map((topo: any) => {
      const live = byId.get(topo.id);
      return {
        ...topo,
        live: live || null,
        density: live?.density ?? 0,
        riskLevel: live?.riskLevel ?? 'safe',
        currentHeadcount: live?.currentHeadcount ?? 0,
        maxCapacity: live?.maxCapacity ?? 0,
        flowRate: live?.flowRate ?? 0,
        gateStatus: live?.gateStatus ?? 'open',
        hasTelemetry: !!live,
      };
    });
  }, [zones, activeNodes]); // <--- ADD activeNodes to this array!
}

const riskColor = (risk: string) => {
  switch (risk) {
    case 'critical': return '#FF3B5C';
    case 'warning': return '#FF7A45';
    case 'caution': return '#FFB627';
    default: return '#22D3A6';
  }
};

export const DigitalTwinView: React.FC<DigitalTwinViewProps> = ({ zones, selectedVenue }) => {
  
  // 2. Filter Topology based on the active venue dropdown
  const activeNodes = useMemo(() => {
    const isKalinga = selectedVenue?.id?.includes('kalinga') || selectedVenue?.name?.includes('Kalinga');
    return VENUE_TOPOLOGY.filter(node => 
      isKalinga ? node.id.startsWith('ks_') : !node.id.startsWith('ks_')
    );
  }, [selectedVenue]);

  const activeEdges = useMemo(() => {
    const isKalinga = selectedVenue?.id?.includes('kalinga') || selectedVenue?.name?.includes('Kalinga');
    return VENUE_EDGES.filter(edge => 
      isKalinga ? edge.source.startsWith('ks_') : !edge.source.startsWith('ks_')
    );
  }, [selectedVenue]);

const mergedNodes = useMergedNodes(zones, activeNodes);
  
  // Safely get the first node of the ACTIVE venue to prevent crashes
  const defaultNodeId = activeNodes.length > 0 ? activeNodes[0].id : '';

  const [selectedZoneId, setSelectedZoneId] = useState<string>(defaultNodeId);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [is3dActive, setIs3dActive] = useState(true);

  // --- Manual route query (Start/Target selectors) ---
  const [queryStartId, setQueryStartId] = useState<string>(defaultNodeId);
  const [queryTargetId, setQueryTargetId] = useState<string>(''); // '' = auto (nearest exit)
  const [queriedRoute, setQueriedRoute] = useState<any | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  // 3. CRITICAL FIX: Reset selections instantly when the venue changes!
  useEffect(() => {
    if (activeNodes.length > 0) {
      setSelectedZoneId(activeNodes[0].id);
      setQueryStartId(activeNodes[0].id);
      setQueryTargetId('');
      setQueriedRoute(null);
    }
  }, [activeNodes]);

  useEffect(() => {
    let cancelled = false;
    if (!queryStartId) return; // Guard clause if nodes haven't loaded

    setIsQuerying(true);
    setQueryError(null);

    api
      .post('/routing/query', {
        start_zone_id: queryStartId,
        target_zone_id: queryTargetId || null,
      })
      .then((res) => {
        if (!cancelled) setQueriedRoute(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[DigitalTwin] Route query failed:', err);
          setQueryError('Could not reach /routing/query — showing static fallback instead.');
          setQueriedRoute(null);
        }
      })
      .finally(() => {
        if (!cancelled) setIsQuerying(false);
      });

    return () => {
      cancelled = true;
    };
  }, [queryStartId, queryTargetId]);

  const selected = mergedNodes.find((n:any) => n.id === selectedZoneId) || mergedNodes[0];

  const hasQueriedRoute = queriedRoute?.status === 'SUCCESS' && queriedRoute.path_nodes.length > 1;
  const passiveLiveRoute = selected?.live?.evacuationRoute;
  const hasPassiveLiveRoute = !hasQueriedRoute && passiveLiveRoute?.status === 'SUCCESS' && (passiveLiveRoute.path_nodes?.length ?? 0) > 1;

  const fallbackExit = nearestExit(selectedZoneId);
  const fallbackPath = fallbackExit ? fallbackShortestPath(selectedZoneId, fallbackExit) : [];

  const displayPath: string[] = hasQueriedRoute
    ? queriedRoute!.path_nodes
    : hasPassiveLiveRoute
    ? (passiveLiveRoute!.path_nodes as string[])
    : fallbackPath;

  const routeSourceLabel = hasQueriedRoute
    ? { text: 'Live A* route — manual query', color: '#059669' }
    : hasPassiveLiveRoute
    ? { text: 'Live A* route — from last telemetry tick', color: '#059669' }
    : { text: 'Static fallback — no live route yet', color: '#D97706' };

  return (
    <div className="p-6 flex flex-col gap-6 font-body text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-slate-800 tracking-tight flex items-center gap-2">
            <Box className="w-6 h-6 text-indigo-600" />
            <span>Digital Twin — {selectedVenue?.name || 'Venue'}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real venue topology (2 gates, 4 zones) with the live A* evacuation route from the backend risk engine.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIs3dActive(!is3dActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
              is3dActive ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            3D Model
          </button>
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
              showHeatmap ? 'bg-sky-600 border-sky-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
            }`}
          >
            Heatmap
          </button>
        </div>
      </div>

      {/* Manual Route Query Panel */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
          <Search className="w-3.5 h-3.5 text-sky-600" />
          Query Route
        </span>

        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-500 uppercase">Start:</span>
          <select
            value={queryStartId}
            onChange={(e) => setQueryStartId(e.target.value)}
            className="bg-transparent text-slate-800 font-bold text-xs focus:outline-none cursor-pointer border-none"
          >
            {mergedNodes.map((n:any) => (
              <option key={`start-${n.id}`} value={n.id} className="bg-white text-slate-800">
                {n.name}
              </option>
            ))}
          </select>
        </div>

        <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />

        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
          <span className="text-[10px] text-slate-500 uppercase">Target:</span>
          <select
            value={queryTargetId}
            onChange={(e) => setQueryTargetId(e.target.value)}
            className="bg-transparent text-slate-800 font-bold text-xs focus:outline-none cursor-pointer border-none"
          >
            <option value="" className="bg-white text-slate-800">Nearest exit (auto)</option>
            {mergedNodes.map((n:any) => (
              <option key={`target-${n.id}`} value={n.id} className="bg-white text-slate-800">
                {n.name}
              </option>
            ))}
          </select>
        </div>

        {isQuerying && <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />}
        {queryError && <span className="text-[11px] text-amber-600">{queryError}</span>}
        {queriedRoute?.status === 'BLOCKED' && (
          <span className="text-[11px] text-[#FF3B5C] font-bold">Route blocked: {queriedRoute.message}</span>
        )}

        <button
          onClick={() => setSelectedZoneId(queryStartId)}
          className="ml-auto text-[11px] font-bold text-sky-600 hover:underline bg-transparent border-none cursor-pointer"
        >
          Show start zone in detail panel →
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {is3dActive && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <ThreeDigitalTwinCanvas
                nodes={mergedNodes}
                edges={VENUE_EDGES}
                selectedZoneId={selected.id}
                highlightedPath={displayPath}
                onSelectZone={(id) => setSelectedZoneId(id)}
              />
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="font-heading font-bold text-sm text-slate-800 flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-500" />
                Venue Loop Layout
              </span>
              <span
                className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg border"
                style={{ color: routeSourceLabel.color, borderColor: `${routeSourceLabel.color}4D`, backgroundColor: `${routeSourceLabel.color}15` }}
              >
                {routeSourceLabel.text}
              </span>
            </div>

            <div className="relative w-full aspect-[4/3] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
                {activeEdges.map((edge, i) => {
                  const a = getTopologyNode(edge.source)!;
                  const b = getTopologyNode(edge.target)!;
                  return <line key={`edge-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#cbd5e1" strokeWidth="1.2" />;
                })}

                {displayPath.length > 1 && displayPath.map((id, i) => {
                  if (i === displayPath.length - 1) return null;
                  const a = getTopologyNode(id);
                  const b = getTopologyNode(displayPath[i + 1]);
                  if (!a || !b) return null;
                  return (
                    <line
                      key={`route-${i}`}
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke={routeSourceLabel.color}
                      strokeWidth="1.6"
                      strokeDasharray="2.5 1.5"
                      className="animate-pulse"
                    />
                  );
                })}

                {mergedNodes.map((node:any) => {
                  const isSelected = node.id === selected.id;
                  const onPath = displayPath.includes(node.id);
                  const color = node.hasTelemetry ? riskColor(node.riskLevel) : '#94a3b8';

                  return (
                    <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onClick={() => setSelectedZoneId(node.id)} className="cursor-pointer">
                      {node.isGate ? (
                        <rect x={-4} y={-4} width={8} height={8} rx={1.5} transform="rotate(45)"
                          fill={color} stroke={isSelected ? '#1e293b' : onPath ? routeSourceLabel.color : 'none'} strokeWidth="1.0" />
                      ) : (
                        <circle r={4} fill={color} stroke={isSelected ? '#1e293b' : onPath ? routeSourceLabel.color : 'none'} strokeWidth="1.0" />
                      )}
                      <text y={-7} textAnchor="middle" fontSize="3.2" fill="#1e293b" fontWeight="bold">{node.shortLabel}</text>
                      {showHeatmap && node.hasTelemetry && (
                        <text y={9} textAnchor="middle" fontSize="2.8" fill="#475569" fontWeight="semibold">{node.density.toFixed(1)} p/m²</text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-slate-300 rounded-full inline-block" /> No telemetry yet</span>
              <span className="flex items-center gap-1"><CircleDot className="w-3 h-3 text-slate-500" /> Zone / junction</span>
              <span className="flex items-center gap-1"><DoorOpen className="w-3 h-3 text-slate-500" /> Gate (diamond)</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-emerald-600" />
              <span className="font-heading font-bold text-xs uppercase tracking-wider text-slate-800">
                Evacuation Sequence
              </span>
            </div>
            {(hasQueriedRoute ? queriedRoute!.message : hasPassiveLiveRoute ? passiveLiveRoute!.message : null) && (
              <p className="text-xs text-slate-600">
                {hasQueriedRoute ? queriedRoute!.message : passiveLiveRoute!.message}
              </p>
            )}
            {!hasQueriedRoute && !hasPassiveLiveRoute && (
              <p className="text-xs text-slate-500">
                Showing the static shortest physical path — no live telemetry-weighted route available for this
                selection yet. Use the Query Route panel above to request the real backend A* route on demand.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {displayPath.length === 0 && <span className="text-slate-500">No path available.</span>}
              {displayPath.map((id, i) => {
                const node = getTopologyNode(id);
                return (
                  <React.Fragment key={`${id}-${i}`}>
                    <span className={`px-2.5 py-1 rounded-lg font-bold font-mono-num text-[11px] border ${
                      i === 0 ? 'bg-sky-50 text-sky-600 border-sky-200'
                      : i === displayPath.length - 1 ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : 'bg-white text-slate-700 border-slate-200'
                    }`}>
                      {node?.name || id}
                    </span>
                    {i < displayPath.length - 1 && <ArrowRight className="w-3 h-3 text-slate-400" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="font-heading font-bold text-base text-slate-800">{selected.name}</h3>
              <p className="text-xs text-slate-500">{selected.isGate ? 'Gate — entry/exit control point' : 'Interior zone'}</p>
            </div>
            {!selected.hasTelemetry && (
              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Awaiting data</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500">Live Density</div>
              <div className="font-mono-num font-bold text-xl text-slate-800 mt-0.5">
                {selected.density.toFixed(1)} <span className="text-xs text-slate-500">p/m²</span>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500">Flow Rate</div>
              <div className="font-mono-num font-bold text-xl text-sky-600 mt-0.5">
                {selected.flowRate} <span className="text-xs text-slate-500">p/min</span>
              </div>
            </div>
          </div>

          {selected.maxCapacity > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">Capacity Load</span>
                <span className="font-mono-num font-bold text-[#FF3B5C]">
                  {selected.currentHeadcount.toLocaleString()} / {selected.maxCapacity.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 border border-slate-200 rounded-full overflow-hidden p-0.5 animate-pulse">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.round((selected.currentHeadcount / selected.maxCapacity) * 100))}%` }}
                />
              </div>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-sky-600" />
              Risk Engine Status
            </span>
            <p className="text-xs text-slate-600 leading-relaxed">
              {!selected.hasTelemetry
                ? 'No camera feed assigned or no telemetry received yet for this zone. It will populate automatically once ingestion starts.'
                : selected.riskLevel === 'critical' || selected.riskLevel === 'warning'
                ? 'Elevated risk — the XGBoost risk engine has flagged this zone. Check Alerts for recommended actions.'
                : 'Normal conditions. No active risk overrides applied by the safety rule engine.'}
            </p>
          </div>

          {selected.isGate && (
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Gate Status:</span>
              <span className={`font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-full ${
                selected.gateStatus === 'open' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}>
                {selected.gateStatus}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {mergedNodes.map((n:any) => (
              <button
                key={n.id}
                onClick={() => setSelectedZoneId(n.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                  n.id === selected.id ? 'bg-sky-600 border-sky-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-200'
                }`}
              >
                {n.shortLabel}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};