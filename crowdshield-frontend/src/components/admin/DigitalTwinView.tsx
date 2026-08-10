import React, { useState, useMemo, useEffect } from 'react';
import { VenueZone } from '../../types';
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
  zones: VenueZone[];
}

interface QueriedRoute {
  status: 'SUCCESS' | 'BLOCKED' | 'ERROR';
  message: string;
  path_nodes: string[];
  cost: number;
  target_exit?: string;
}

function useMergedNodes(zones: VenueZone[]) {
  return useMemo(() => {
    const byId = new Map(zones.map((z) => [z.id, z]));
    return VENUE_TOPOLOGY.map((topo) => {
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
  }, [zones]);
}

const riskColor = (risk: string) => {
  switch (risk) {
    case 'critical': return '#FF3B5C';
    case 'warning': return '#FF7A45';
    case 'caution': return '#FFB627';
    default: return '#22D3A6';
  }
};

export const DigitalTwinView: React.FC<DigitalTwinViewProps> = ({ zones }) => {
  const mergedNodes = useMergedNodes(zones);
  const [selectedZoneId, setSelectedZoneId] = useState<string>(VENUE_TOPOLOGY[0].id);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [is3dActive, setIs3dActive] = useState(true);

  // --- Manual route query (Start/Target selectors) ---
  const [queryStartId, setQueryStartId] = useState<string>(VENUE_TOPOLOGY[0].id);
  const [queryTargetId, setQueryTargetId] = useState<string>(''); // '' = auto (nearest exit)
  const [queriedRoute, setQueriedRoute] = useState<QueriedRoute | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
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

  const selected = mergedNodes.find((n) => n.id === selectedZoneId) || mergedNodes[0];

  // Route priority: 1) manual query result (real backend A*, on-demand)
  // 2) passive live route attached to the selected zone's last telemetry tick
  // 3) static unweighted fallback (clearly labeled, never presented as AI-computed)
  const hasQueriedRoute = queriedRoute?.status === 'SUCCESS' && queriedRoute.path_nodes.length > 1;
  const passiveLiveRoute = selected.live?.evacuationRoute;
  const hasPassiveLiveRoute = !hasQueriedRoute && passiveLiveRoute?.status === 'SUCCESS' && (passiveLiveRoute.path_nodes?.length ?? 0) > 1;

  const fallbackExit = nearestExit(selectedZoneId);
  const fallbackPath = fallbackExit ? fallbackShortestPath(selectedZoneId, fallbackExit) : [];

  const displayPath: string[] = hasQueriedRoute
    ? queriedRoute!.path_nodes
    : hasPassiveLiveRoute
    ? (passiveLiveRoute!.path_nodes as string[])
    : fallbackPath;

  const routeSourceLabel = hasQueriedRoute
    ? { text: 'Live A* route — manual query', color: '#22D3A6' }
    : hasPassiveLiveRoute
    ? { text: 'Live A* route — from last telemetry tick', color: '#22D3A6' }
    : { text: 'Static fallback — no live route yet', color: '#FFB627' };

  return (
    <div className="p-6 flex flex-col gap-6 font-body">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-slate-100 tracking-tight flex items-center gap-2">
            <Box className="w-6 h-6 text-[#7C6CFF]" />
            <span>Digital Twin — ITER Campus Venue</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real venue topology (2 gates, 4 zones) with the live A* evacuation route from the backend risk engine.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIs3dActive(!is3dActive)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
              is3dActive ? 'bg-[#7C6CFF] border-[#7C6CFF] text-white' : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            3D Model
          </button>
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
              showHeatmap ? 'bg-[#2C7BE5] border-[#2C7BE5] text-white' : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            Heatmap
          </button>
        </div>
      </div>

      {/* Manual Route Query Panel */}
      <div className="bg-[#151726] border border-white/10 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
          <Search className="w-3.5 h-3.5 text-[#2C7BE5]" />
          Query Route
        </span>

        <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg border border-white/10">
          <span className="text-[10px] text-white/60 uppercase">Start:</span>
          <select
            value={queryStartId}
            onChange={(e) => setQueryStartId(e.target.value)}
            className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
          >
            {mergedNodes.map((n) => (
              <option key={`start-${n.id}`} value={n.id} className="bg-[#151726] text-white">
                {n.name}
              </option>
            ))}
          </select>
        </div>

        <ArrowRight className="w-3.5 h-3.5 text-[#22D3A6]" />

        <div className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg border border-white/10">
          <span className="text-[10px] text-white/60 uppercase">Target:</span>
          <select
            value={queryTargetId}
            onChange={(e) => setQueryTargetId(e.target.value)}
            className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
          >
            <option value="" className="bg-[#151726] text-white">Nearest exit (auto)</option>
            {mergedNodes.map((n) => (
              <option key={`target-${n.id}`} value={n.id} className="bg-[#151726] text-white">
                {n.name}
              </option>
            ))}
          </select>
        </div>

        {isQuerying && <Loader2 className="w-4 h-4 text-[#2C7BE5] animate-spin" />}
        {queryError && <span className="text-[11px] text-[#FF7A45]">{queryError}</span>}
        {queriedRoute?.status === 'BLOCKED' && (
          <span className="text-[11px] text-[#FF3B5C] font-bold">Route blocked: {queriedRoute.message}</span>
        )}

        <button
          onClick={() => setSelectedZoneId(queryStartId)}
          className="ml-auto text-[11px] font-bold text-[#2C7BE5] hover:underline"
        >
          Show start zone in detail panel →
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {is3dActive && (
            <div className="bg-[#111827] border border-slate-800/80 rounded-2xl overflow-hidden">
              <ThreeDigitalTwinCanvas
                nodes={mergedNodes}
                edges={VENUE_EDGES}
                selectedZoneId={selected.id}
                highlightedPath={displayPath}
                onSelectZone={(id) => setSelectedZoneId(id)}
              />
            </div>
          )}

          <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="font-heading font-bold text-sm text-slate-100 flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#22D3A6]" />
                Venue Loop Layout
              </span>
              <span
                className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg border"
                style={{ color: routeSourceLabel.color, borderColor: `${routeSourceLabel.color}4D`, backgroundColor: `${routeSourceLabel.color}26` }}
              >
                {routeSourceLabel.text}
              </span>
            </div>

            <div className="relative w-full aspect-[4/3] bg-[#0B0F19] rounded-xl border border-white/10 overflow-hidden">
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
                {VENUE_EDGES.map((edge, i) => {
                  const a = getTopologyNode(edge.source)!;
                  const b = getTopologyNode(edge.target)!;
                  return <line key={`edge-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#2A2E45" strokeWidth="1.2" />;
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

                {mergedNodes.map((node) => {
                  const isSelected = node.id === selected.id;
                  const onPath = displayPath.includes(node.id);
                  const color = node.hasTelemetry ? riskColor(node.riskLevel) : '#3A3F55';

                  return (
                    <g key={node.id} transform={`translate(${node.x}, ${node.y})`} onClick={() => setSelectedZoneId(node.id)} className="cursor-pointer">
                      {node.isGate ? (
                        <rect x={-4} y={-4} width={8} height={8} rx={1.5} transform="rotate(45)"
                          fill={color} stroke={isSelected ? '#fff' : onPath ? routeSourceLabel.color : 'none'} strokeWidth="0.8" />
                      ) : (
                        <circle r={4} fill={color} stroke={isSelected ? '#fff' : onPath ? routeSourceLabel.color : 'none'} strokeWidth="0.8" />
                      )}
                      <text y={-7} textAnchor="middle" fontSize="3" fill="#E5E7EB" fontWeight="bold">{node.shortLabel}</text>
                      {showHeatmap && node.hasTelemetry && (
                        <text y={9} textAnchor="middle" fontSize="2.6" fill="#9CA3AF">{node.density.toFixed(1)} p/m²</text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#3A3F55] rounded-full inline-block" /> No telemetry yet</span>
              <span className="flex items-center gap-1"><CircleDot className="w-3 h-3" /> Zone / junction</span>
              <span className="flex items-center gap-1"><DoorOpen className="w-3 h-3" /> Gate (diamond)</span>
            </div>
          </div>

          <div className="bg-[#151726] border border-white/10 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Route className="w-4 h-4 text-[#22D3A6]" />
              <span className="font-heading font-bold text-xs uppercase tracking-wider text-white">
                Evacuation Sequence
              </span>
            </div>
            {(hasQueriedRoute ? queriedRoute!.message : hasPassiveLiveRoute ? passiveLiveRoute!.message : null) && (
              <p className="text-xs text-slate-300">
                {hasQueriedRoute ? queriedRoute!.message : passiveLiveRoute!.message}
              </p>
            )}
            {!hasQueriedRoute && !hasPassiveLiveRoute && (
              <p className="text-xs text-slate-400">
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
                      i === 0 ? 'bg-[#2C7BE5]/20 text-[#2C7BE5] border-[#2C7BE5]/40'
                      : i === displayPath.length - 1 ? 'bg-[#22D3A6]/20 text-[#22D3A6] border-[#22D3A6]/40'
                      : 'bg-white/10 text-white border-white/15'
                    }`}>
                      {node?.name || id}
                    </span>
                    {i < displayPath.length - 1 && <ArrowRight className="w-3 h-3 text-white/40" />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <h3 className="font-heading font-bold text-base text-slate-100">{selected.name}</h3>
              <p className="text-xs text-slate-400">{selected.isGate ? 'Gate — entry/exit control point' : 'Interior zone'}</p>
            </div>
            {!selected.hasTelemetry && (
              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-slate-700 text-slate-300">Awaiting data</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-[#151726] border border-white/10">
              <div className="text-[11px] font-semibold text-slate-400">Live Density</div>
              <div className="font-mono-num font-bold text-xl text-slate-100 mt-0.5">
                {selected.density.toFixed(1)} <span className="text-xs text-slate-400">p/m²</span>
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-[#151726] border border-white/10">
              <div className="text-[11px] font-semibold text-slate-400">Flow Rate</div>
              <div className="font-mono-num font-bold text-xl text-[#2C7BE5] mt-0.5">
                {selected.flowRate} <span className="text-xs text-slate-400">p/min</span>
              </div>
            </div>
          </div>

          {selected.maxCapacity > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-100">Capacity Load</span>
                <span className="font-mono-num font-bold text-[#FF3B5C]">
                  {selected.currentHeadcount.toLocaleString()} / {selected.maxCapacity.toLocaleString()}
                </span>
              </div>
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#22D3A6] via-[#FFB627] to-[#FF3B5C] transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.round((selected.currentHeadcount / selected.maxCapacity) * 100))}%` }}
                />
              </div>
            </div>
          )}

          <div className="bg-[#151726] border border-white/10 p-4 rounded-xl flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[#2C7BE5]" />
              Risk Engine Status
            </span>
            <p className="text-xs text-slate-300 leading-relaxed">
              {!selected.hasTelemetry
                ? 'No camera feed assigned or no telemetry received yet for this zone. It will populate automatically once ingestion starts.'
                : selected.riskLevel === 'critical' || selected.riskLevel === 'warning'
                ? 'Elevated risk — the XGBoost risk engine has flagged this zone. Check Alerts for recommended actions.'
                : 'Normal conditions. No active risk overrides applied by the safety rule engine.'}
            </p>
          </div>

          {selected.isGate && (
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Gate Status:</span>
              <span className={`font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-full ${
                selected.gateStatus === 'open' ? 'bg-[#22D3A6]/20 text-[#059669]'
                : selected.gateStatus === 'restricted' || selected.gateStatus === 'closed' ? 'bg-[#FF3B5C]/15 text-[#FF3B5C]'
                : 'bg-[#FFB627]/20 text-[#D97706]'
              }`}>
                {selected.gateStatus}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {mergedNodes.map((n) => (
              <button
                key={n.id}
                onClick={() => setSelectedZoneId(n.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                  n.id === selected.id ? 'bg-[#2C7BE5] border-[#2C7BE5] text-white' : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/30'
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