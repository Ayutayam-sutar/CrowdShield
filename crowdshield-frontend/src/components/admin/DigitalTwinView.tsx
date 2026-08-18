import React, { useState, useMemo, useEffect } from 'react';
import { VenueZone, VenueInfo } from '../../types';
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
  Terminal
} from 'lucide-react';
interface DigitalTwinViewProps {
  zones: any[];
  selectedVenue?: VenueInfo | null; 
}
interface QueriedRoute {
  status: 'SUCCESS' | 'BLOCKED' | 'ERROR';
  message: string;
  path_nodes: string[];
  cost: number;
  target_exit?: string;
}
function useMergedNodes(zones: any[], activeNodes: any[]) {
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
  }, [zones, activeNodes]); 
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
  const defaultNodeId = activeNodes.length > 0 ? activeNodes[0].id : '';
  const [selectedZoneId, setSelectedZoneId] = useState<string>(defaultNodeId);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [is3dActive, setIs3dActive] = useState(true);
  const [queryStartId, setQueryStartId] = useState<string>(defaultNodeId);
  const [queryTargetId, setQueryTargetId] = useState<string>(''); 
  const [queriedRoute, setQueriedRoute] = useState<any | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
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
    if (!queryStartId) return;
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
    ? { text: 'Live A* route — manual query', color: '#67b2b9' }
    : hasPassiveLiveRoute
    ? { text: 'Live A* route — from last telemetry', color: '#67b2b9' }
    : { text: 'Static fallback — no live route yet', color: '#f59e0b' };
  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 lg:gap-8 font-body text-slate-800 bg-[#FAFAF7] min-h-screen">
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#67b2b9]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none opacity-60" />
        <div className="relative z-10">
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#67b2b9]/20 to-[#648d6a]/20 text-[#648d6a] rounded-xl shadow-inner">
              <Box className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span>Digital Twin — {selectedVenue?.name || 'Venue'}</span>
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-2 max-w-2xl leading-relaxed">
            Real venue topology (gates, interior zones) with live A* evacuation routing powered by the backend risk engine.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 relative z-10 mt-2 md:mt-0">
          <button
            onClick={() => setIs3dActive(!is3dActive)}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 border-none ${
              is3dActive 
                ? 'bg-gradient-to-r from-[#67b2b9] to-[#648d6a] text-white shadow-[#67b2b9]/30' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Box className="w-4 h-4" /> 3D Model
          </button>
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 border-none ${
              showHeatmap 
                ? 'bg-gradient-to-r from-[#67b2b9] to-[#648d6a] text-white shadow-[#67b2b9]/30' 
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <Compass className="w-4 h-4" /> Heatmap
          </button>
        </div>
      </div>

      {/* ── Manual Route Query Panel ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row flex-wrap items-center gap-4 lg:gap-6">
        <span className="flex items-center gap-2 text-xs sm:text-sm font-black text-slate-800 uppercase tracking-widest w-full sm:w-auto">
          <Search className="w-4 h-4 text-[#67b2b9]" />
          Pathfinder Query
        </span>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 w-full sm:w-auto flex-1">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest shrink-0">Start:</span>
            <select
              value={queryStartId}
              onChange={(e) => setQueryStartId(e.target.value)}
              className="bg-transparent text-slate-800 font-mono font-bold text-xs sm:text-sm focus:outline-none cursor-pointer border-none w-full outline-none"
            >
              {mergedNodes.map((n:any) => (
                <option key={`start-${n.id}`} value={n.id} className="bg-white text-slate-800 font-mono">
                  {n.name}
                </option>
              ))}
            </select>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-300 hidden sm:block shrink-0" />
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 w-full sm:w-auto flex-1">
            <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest shrink-0">Target:</span>
            <select
              value={queryTargetId}
              onChange={(e) => setQueryTargetId(e.target.value)}
              className="bg-transparent text-slate-800 font-mono font-bold text-xs sm:text-sm focus:outline-none cursor-pointer border-none w-full outline-none"
            >
              <option value="" className="bg-white text-slate-800 font-mono">Nearest safe exit (Auto)</option>
              {mergedNodes.map((n:any) => (
                <option key={`target-${n.id}`} value={n.id} className="bg-white text-slate-800 font-mono">
                  {n.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-between sm:justify-end">
          {isQuerying && <Loader2 className="w-5 h-5 text-[#67b2b9] animate-spin" />}
          {queryError && <span className="text-[10px] sm:text-[11px] font-mono font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded border border-rose-200">{queryError}</span>}
          {queriedRoute?.status === 'BLOCKED' && (
            <span className="text-[10px] sm:text-[11px] font-mono font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded border border-rose-200 uppercase tracking-wider">
              Path Blocked: {queriedRoute.message}
            </span>
          )}
          <button
            onClick={() => setSelectedZoneId(queryStartId)}
            className="text-[10px] sm:text-xs font-black text-[#648d6a] hover:text-[#5a9c9f] uppercase tracking-widest bg-transparent border-none cursor-pointer ml-auto"
          >
            Inspect Node →
          </button>
        </div>
      </div>

      {/* ── Main Dashboard Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
        {/* ── Left Column: 3D and 2D Visualizers ── */}
        <div className="xl:col-span-8 flex flex-col gap-6 lg:gap-8">
          {is3dActive && (
            <div className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm h-[400px] sm:h-[500px]">
              <ThreeDigitalTwinCanvas
                nodes={mergedNodes}
                edges={VENUE_EDGES}
                selectedZoneId={selected.id}
                highlightedPath={displayPath}
                onSelectZone={(id) => setSelectedZoneId(id)}
              />
            </div>
          )}
          {/* 2D SVG Blueprint */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <span className="font-heading font-black text-base sm:text-lg text-slate-800 flex items-center gap-2.5 tracking-tight">
                <Route className="w-5 h-5 text-[#67b2b9]" />
                Topological Vector Map
              </span>
              <span
                className="text-[9px] sm:text-[10px] font-mono font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border shadow-sm"
                style={{ color: routeSourceLabel.color, borderColor: `${routeSourceLabel.color}4D`, backgroundColor: `${routeSourceLabel.color}15` }}
              >
                {routeSourceLabel.text}
              </span>
            </div>
            <div className="relative w-full aspect-square sm:aspect-video bg-[#FAFAF7] rounded-2xl border border-slate-200/80 overflow-hidden shadow-inner flex-1">
              {/* Subtle Grid Background */}
              <div
                className="absolute inset-0 opacity-40 pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
                  backgroundSize: '16px 16px',
                }}
              />
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full z-10" preserveAspectRatio="xMidYMid meet">
                {activeEdges.map((edge, i) => {
                  const a = getTopologyNode(edge.source)!;
                  const b = getTopologyNode(edge.target)!;
                  return <line key={`edge-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#e2e8f0" strokeWidth="1.5" />;
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
                      strokeWidth="2"
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
                    <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onClick={() => setSelectedZoneId(node.id)} className="cursor-pointer group">
                      {node.isGate ? (
                        <rect x={-4.5} y={-4.5} width={9} height={9} rx={1.5} transform="rotate(45)"
                          fill={color} stroke={isSelected ? '#0f172a' : onPath ? routeSourceLabel.color : '#ffffff'} strokeWidth={isSelected ? "1.5" : "1"} className="transition-all group-hover:scale-110" />
                      ) : (
                        <circle r={4.5} fill={color} stroke={isSelected ? '#0f172a' : onPath ? routeSourceLabel.color : '#ffffff'} strokeWidth={isSelected ? "1.5" : "1"} className="transition-all group-hover:scale-110" />
                      )}
                      <text y={-8} textAnchor="middle" fontSize="3" fill="#0f172a" fontWeight="bold" fontFamily="monospace" className="select-none">{node.shortLabel}</text>
                      {showHeatmap && node.hasTelemetry && (
                        <text y={10} textAnchor="middle" fontSize="2.8" fill="#475569" fontWeight="bold" fontFamily="monospace" className="select-none">{node.density.toFixed(1)} p/m²</text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-[10px] sm:text-[11px] font-mono font-bold text-slate-500 uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-400 rounded-full inline-block shadow-sm" /> No telemetry</span>
              <span className="flex items-center gap-1.5"><CircleDot className="w-3.5 h-3.5 text-slate-600" /> Zone Node</span>
              <span className="flex items-center gap-1.5"><DoorOpen className="w-3.5 h-3.5 text-slate-600" /> Gate Node</span>
            </div>
          </div>
        </div>
        {/* ── Right Column: Node Details & Terminal ── */}
        <div className="xl:col-span-4 flex flex-col gap-6 lg:gap-8">
          {/* Node Inspector Card */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 flex flex-col gap-6 shadow-sm h-fit">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex flex-col gap-1">
                <h3 className="font-heading font-black text-xl sm:text-2xl text-slate-900 tracking-tight">{selected.name}</h3>
                <p className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                  {selected.isGate ? 'Gate — Entry/Exit Node' : 'Interior Sector Node'}
                </p>
              </div>
              {!selected.hasTelemetry && (
                <span className="text-[9px] font-mono font-black uppercase tracking-widest px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 shadow-sm shrink-0">
                  Offline
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-inner flex flex-col items-center text-center">
                <div className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1">Density</div>
                <div className="font-mono font-black text-3xl sm:text-4xl text-slate-800 tracking-tighter">
                  {selected.density.toFixed(1)} <span className="text-xs font-bold text-slate-400">p/m²</span>
                </div>
              </div>
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-inner flex flex-col items-center text-center">
                <div className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1">Flow Rate</div>
                <div className="font-mono font-black text-3xl sm:text-4xl text-[#67b2b9] tracking-tighter">
                  {selected.flowRate} <span className="text-xs font-bold text-slate-400">p/min</span>
                </div>
              </div>
            </div>
            {selected.maxCapacity > 0 && (
              <div className="flex flex-col gap-2.5 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-slate-500 uppercase tracking-widest">Sector Load</span>
                  <span className="font-mono font-black text-slate-900 tracking-wider">
                    {selected.currentHeadcount.toLocaleString()} / <span className="text-slate-400">{selected.maxCapacity.toLocaleString()}</span>
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-200 border-none rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#67b2b9] to-[#648d6a] transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(100, Math.round((selected.currentHeadcount / selected.maxCapacity) * 100))}%` }}
                  />
                </div>
              </div>
            )}
            {selected.isGate && (
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-widest">Gate Actuator:</span>
                <span className={`font-mono font-black text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-lg border shadow-sm ${
                  selected.gateStatus === 'open' ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-rose-50 text-rose-600 border-rose-200'
                }`}>
                  {selected.gateStatus}
                </span>
              </div>
            )}
            {/* Tactical AI Terminal Readout */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-3 font-mono mt-2">
              <span className="text-[11px] font-black text-[#67b2b9] flex items-center gap-2 uppercase tracking-widest border-b border-slate-800 pb-3">
                <Terminal className="w-4 h-4" />
                Sentinel Risk Engine
              </span>
              <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed font-medium">
                <span className="text-slate-500 mr-2">›</span>
                {!selected.hasTelemetry
                  ? 'Awaiting telemetry stream. Node offline.'
                  : selected.riskLevel === 'critical' || selected.riskLevel === 'warning'
                  ? <span className="text-rose-400">ALERT: High density anomaly detected. Risk override active. A* re-routing engaged.</span>
                  : 'Status Nominal. Safe thresholds verified.'}
              </p>
            </div>
          </div>
          {/* Node Quick Selectors */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            <span className="font-heading font-black text-sm text-slate-800 tracking-tight">Quick Inspect</span>
            <div className="flex flex-wrap gap-2">
              {mergedNodes.map((n:any) => (
                <button
                  key={n.id}
                  onClick={() => setSelectedZoneId(n.id)}
                  className={`px-3 py-1.5 rounded-xl font-mono font-bold text-[10px] sm:text-[11px] uppercase tracking-widest transition-all cursor-pointer shadow-sm border-none ${
                    n.id === selected.id 
                      ? 'bg-gradient-to-r from-[#67b2b9] to-[#648d6a] text-white shadow-md scale-105' 
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
                  }`}
                >
                  {n.shortLabel}
                </button>
              ))}
            </div>
          </div>

          {/* Evacuation Sequence Display */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <Route className="w-5 h-5 text-[#67b2b9]" />
              <span className="font-heading font-black text-sm sm:text-base tracking-tight text-slate-800">
                Evacuation Sequence
              </span>
            </div>
            {(hasQueriedRoute ? queriedRoute!.message : hasPassiveLiveRoute ? passiveLiveRoute!.message : null) && (
              <p className="text-[11px] sm:text-xs text-slate-500 font-mono font-medium leading-relaxed">
                {hasQueriedRoute ? queriedRoute!.message : passiveLiveRoute!.message}
              </p>
            )}
            {!hasQueriedRoute && !hasPassiveLiveRoute && (
              <p className="text-[11px] sm:text-xs text-slate-400 font-mono font-medium leading-relaxed italic">
                Showing static shortest physical path. Use the Query Route panel to request the backend A* route.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 text-xs pt-2">
              {displayPath.length === 0 && <span className="text-slate-500 font-mono font-bold">No path available.</span>}
              {displayPath.map((id, i) => {
                const node = getTopologyNode(id);
                return (
                  <React.Fragment key={`${id}-${i}`}>
                    <span className={`px-2.5 py-1 rounded-lg font-black font-mono text-[10px] uppercase tracking-widest border shadow-sm ${
                      i === 0 ? 'bg-[#67b2b9]/10 text-[#648d6a] border-[#67b2b9]/30'
                      : i === displayPath.length - 1 ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                      {node?.shortLabel || id}
                    </span>
                    {i < displayPath.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-300" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};