import React, { useState, useEffect } from 'react';
import { VenueZone, CrowdAlert, RiskLevel } from '../../types';
import {
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Eye,
  Radio
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

// Legacy phantom zone IDs from the old mock zone_offsets fallback
// (z-1 / z-01 / z-2 / z-02 / z-3 / z-03 / z-4 / z-04). Remove this filter
// once the DB cleanup has actually been run and these rows are deleted.
// TODO: move this into a shared utils file — it's now duplicated in
// LiveMapView.tsx and here.
const isLegacyPhantomZone = (id: string): boolean => /^z-0?\d$/i.test(id || '');

interface DashboardViewProps {
  zones: VenueZone[];
  alerts: CrowdAlert[];
  isScenarioActive: boolean;
  onNavigateToMap: () => void;
  onNavigateToAlerts: () => void;
  onOpenEmergencyBroadcast: () => void;
  recentLogs?: { timestamp: string; action: string; source: string; type: 'success' | 'warning' | 'info' }[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  zones,
  alerts,
  isScenarioActive,
  onNavigateToMap,
  onNavigateToAlerts,
  onOpenEmergencyBroadcast,
  recentLogs,
}) => {
  // Real zones only — legacy mock zones filtered out until the DB is cleaned up.
  const cleanZones = zones.filter((z) => !isLegacyPhantomZone(z.id));
  const totalHeadcount = cleanZones.reduce((acc, z) => acc + (z.currentHeadcount ?? 0), 0);

  // Dynamic Trend Chart state, sampled from live `cleanZones` updates.
  // Sampling interval is 15s x 20 points = 5 minutes, so the "5 min" labels
  // below are actually measuring a 5-minute window instead of being fake.
  const [trendData, setTrendData] = useState<
    { time: string; meanDensity: number; predicted: number; totalHeadcount: number }[]
  >([]);

  const zonesRef = React.useRef(cleanZones);
  useEffect(() => {
    zonesRef.current = cleanZones;
  }, [zones]);

  const sample = React.useCallback(() => {
    const currentZones = zonesRef.current;
    const currentTimeString = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    if (!currentZones || currentZones.length === 0) {
      setTrendData((prev) => [...prev, { time: currentTimeString, meanDensity: 0, predicted: 0, totalHeadcount: 0 }].slice(-20));
      return;
    }

    const meanDensity = Number(
      (currentZones.reduce((acc, z) => acc + (z.density || 0), 0) / currentZones.length).toFixed(2)
    );
    const predicted = Number(
      (currentZones.reduce((acc, z) => acc + (z.density || 0) * (1 + (z.riskScore || 0) / 100), 0) / currentZones.length).toFixed(2)
    );
    const totalHeadcountNow = currentZones.reduce((acc, z) => acc + (z.currentHeadcount ?? 0), 0);

    setTrendData((prev) => [...prev, { time: currentTimeString, meanDensity, predicted, totalHeadcount: totalHeadcountNow }].slice(-20));
  }, []);

  // Scheduled sampling — 15s x 20 samples = genuine 5-minute rolling window.
  useEffect(() => {
    sample(); // capture an immediate point so the chart isn't empty on load
    const interval = setInterval(sample, 15000);
    return () => clearInterval(interval);
  }, [sample]);

  // Immediate resample whenever headcount changes meaningfully (e.g. a
  // scenario trigger firing, or a real sudden camera-detected surge), so the
  // chart doesn't lag up to 15s behind the metric cards, which are always
  // computed live on every render regardless of the sampling timer.
  const lastSampledHeadcountRef = React.useRef<number | null>(null);
  useEffect(() => {
    if (lastSampledHeadcountRef.current === null) {
      lastSampledHeadcountRef.current = totalHeadcount;
      return;
    }
    if (totalHeadcount !== lastSampledHeadcountRef.current) {
      lastSampledHeadcountRef.current = totalHeadcount;
      sample();
    }
  }, [totalHeadcount, sample]);

  // Calculated aggregate metrics — all from cleanZones (real zones only), zero fallbacks.
  const totalZoneRisk = cleanZones.reduce((acc, z) => acc + (z.riskScore || 0), 0);
  const averageZoneRisk = cleanZones.length > 0 ? Math.round(totalZoneRisk / cleanZones.length) : 0;
  const venueRiskScore = averageZoneRisk;

  const totalFlowRate = cleanZones.reduce((acc, z) => acc + (z.flowRate ?? 0), 0);
  const meanFlowVelocity = cleanZones.length > 0 ? (totalFlowRate / cleanZones.length).toFixed(1) : '0.0';
  const affectedZonesCount = cleanZones.filter((z) => z.riskLevel === 'critical' || z.riskLevel === 'warning').length;
  const affectedZonesList = cleanZones.filter((z) => z.riskLevel === 'critical' || z.riskLevel === 'warning');

  const reportingZonesCount = cleanZones.filter((z) => (z.currentHeadcount ?? 0) > 0).length;
  const hasLiveTelemetry = reportingZonesCount > 0;

  // Real percent change over the sampled window, instead of a hardcoded "+5%".
  // Compares current total headcount to the oldest sample still in the window.
  const headcountFiveMinAgo = trendData.length > 0 ? trendData[0].totalHeadcount : totalHeadcount;
  const headcountPercentChange =
    headcountFiveMinAgo > 0
      ? Math.round(((totalHeadcount - headcountFiveMinAgo) / headcountFiveMinAgo) * 100)
      : totalHeadcount > 0
      ? 100
      : 0;

  const getRiskLevelBadge = (level: RiskLevel, score: number) => {
    switch (level) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono-num bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30">
            <span className="w-2 h-2 rounded-full bg-[#FF3B5C] animate-ping" />
            CRITICAL · {score}%
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono-num bg-[#FF7A45]/15 text-[#FF7A45] border border-[#FF7A45]/30">
            <span className="w-2 h-2 rounded-full bg-[#FF7A45]" />
            HIGH · {score}%
          </span>
        );
      case 'caution':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono-num bg-[#FFB627]/15 text-[#FFB627] border border-[#FFB627]/40">
            <span className="w-2 h-2 rounded-full bg-[#FFB627]" />
            MODERATE · {score}%
          </span>
        );
      case 'safe':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-mono-num bg-[#22D3A6]/15 text-[#22D3A6] border border-[#22D3A6]/30">
            <span className="w-2 h-2 rounded-full bg-[#22D3A6]" />
            SAFE · {score}%
          </span>
        );
    }
  };

  return (
    <div className="bg-[#0B0F19] min-h-screen text-slate-100 p-6 flex flex-col gap-6 font-body">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl tracking-tight">
            Operations Dashboard
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Real-time status and predictive risk assessment for all active venue sectors.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateToMap}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-[#06b6d4] border border-[#06b6d4]/40 rounded-xl font-heading font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>View Live Map</span>
          </button>
          <button
            onClick={onOpenEmergencyBroadcast}
            className="px-3.5 py-2 bg-[#f43f5e] hover:bg-[#e02e4d] text-white rounded-xl font-heading font-bold text-xs flex items-center gap-2 shadow-md transition-colors cursor-pointer"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Emergency Broadcast</span>
          </button>
        </div>
      </div>

      {/* No-live-telemetry banner — explicit, honest empty state instead of
          silently showing zeros that look identical to "system is fine" */}
      {!hasLiveTelemetry && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-center gap-3 text-amber-300 text-xs font-mono-num">
          <Radio className="w-4 h-4 animate-pulse flex-shrink-0" />
          <span>
            No live camera telemetry detected across any of the {cleanZones.length} venue zones. All
            metrics below are at baseline (0) until real feed data or a simulated scenario is running.
          </span>
        </div>
      )}

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Affected Zones */}
        <div className={`bg-[#111827] border border-slate-800/80 rounded-xl p-5 shadow-xl flex flex-col justify-between relative overflow-hidden transition-all ${affectedZonesCount > 0 ? 'animate-pulse border-[#f43f5e]/80 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : ''}`}>
          <div className="w-1.5 h-full bg-[#f43f5e] absolute left-0 top-0" />
          <div className="flex items-center justify-between pl-2">
            <span className="text-slate-400 text-sm">Affected Sectors</span>
            <div className="p-2 bg-[#f43f5e]/10 text-[#f43f5e] rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="pl-2 mt-3">
            <div className="text-3xl font-bold text-slate-100 font-mono-num">
              {affectedZonesCount} <span className="text-sm font-normal text-white/50">/ {cleanZones.length} Total</span>
            </div>
            <p className="text-[11px] text-[#f43f5e] font-semibold mt-1 truncate">
              {affectedZonesList.length > 0
                ? affectedZonesList.map(z => `${z.name} ${z.riskLevel.toUpperCase()}`).join(', ')
                : 'No critical zones'}
            </p>
          </div>
        </div>

        {/* Metric 2: Total Headcount */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Total Headcount</span>
            <div className="p-2 bg-[#06b6d4]/10 text-[#06b6d4] rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-100 font-mono-num">
              {totalHeadcount.toLocaleString()}
            </div>
            {trendData.length > 1 ? (
              <p className={`text-[11px] font-semibold mt-1 flex items-center gap-1 font-mono-num ${headcountPercentChange > 0 ? 'text-[#f43f5e]' : headcountPercentChange < 0 ? 'text-[#22D3A6]' : 'text-white/40'}`}>
                {headcountPercentChange > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : headcountPercentChange < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                {headcountPercentChange > 0 ? '+' : ''}{headcountPercentChange}% over last {Math.min(trendData.length * 15, 300) / 60} min
              </p>
            ) : (
              <p className="text-[11px] text-white/40 font-semibold mt-1">Gathering trend data...</p>
            )}
          </div>
        </div>

        {/* Metric 3: Active Alerts */}
        <div
          onClick={onNavigateToAlerts}
          className={`bg-[#111827] border border-slate-800/80 rounded-xl p-5 shadow-xl flex flex-col justify-between cursor-pointer hover:border-[#f43f5e]/50 transition-colors ${alerts.length > 0 ? 'animate-pulse border-[#f43f5e]/80 shadow-[0_0_15px_rgba(244,63,94,0.2)]' : ''}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Active Crowd Alerts</span>
            <div className="p-2 bg-[#f43f5e]/10 text-[#f43f5e] rounded-xl">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-100 font-mono-num">
              {alerts.length} <span className="text-xs font-normal text-white/50">Requires action</span>
            </div>
            <p className="text-[11px] text-white/40 font-semibold mt-1 font-mono-num">
              {alerts.length > 0 ? `${alerts.length} open alert${alerts.length > 1 ? 's' : ''} from Risk Engine` : 'No open alerts'}
            </p>
          </div>
        </div>

        {/* Metric 4: Average Flow Velocity */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm">Mean Flow Velocity</span>
            <div className="p-2 bg-[#7C6CFF]/10 text-[#7C6CFF] rounded-xl">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-slate-100 font-mono-num">
              {meanFlowVelocity} <span className="text-sm font-normal text-white/50">p/min</span>
            </div>
            <p className="text-[11px] text-[#06b6d4] font-semibold mt-1">
              Live sector average
            </p>
          </div>
        </div>
      </div>

      {/* Signature Component — Risk Pulse Gauge & Predictive Trend Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 1 Column: Circular Risk Pulse Gauge */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-xl p-5 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden">
          <span className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">
            Venue Composite Risk Index
          </span>

          {/* Heartbeat Pulse Gauge Circle */}
          <div className="relative my-4 flex items-center justify-center">
            <div className={`w-44 h-44 rounded-full border-4 flex flex-col items-center justify-center bg-[#111827] shadow-inner relative z-10 transition-colors ${
              venueRiskScore >= 80
                ? 'border-[#f43f5e] text-[#f43f5e]'
                : venueRiskScore >= 60
                ? 'border-amber-500 text-amber-500'
                : 'border-[#22D3A6] text-[#22D3A6]'
            }`}>
              <span className="font-heading font-extrabold text-5xl font-mono-num tracking-tighter">
                {venueRiskScore}%
              </span>
              <span className="text-xs font-bold uppercase tracking-wider mt-1">
                {venueRiskScore >= 80 ? 'CRITICAL RISK' : venueRiskScore >= 60 ? 'HIGH WARNING' : 'SAFE OPERATIONAL'}
              </span>
            </div>

            {/* Expanding Pulse Ring — only animates when there's something to warn about */}
            {venueRiskScore >= 60 && (
              <div className={`absolute inset-0 rounded-full border-2 animate-risk-pulse ${
                venueRiskScore >= 80 ? 'border-[#f43f5e]' : 'border-amber-500'
              }`} />
            )}
          </div>

          <p className="text-xs text-white/50 max-w-xs mt-2 font-mono-num">
            {cleanZones.length === 0
              ? 'Awaiting live telemetry stream...'
              : `Averaged across ${cleanZones.length} active venue zone${cleanZones.length > 1 ? 's' : ''}.`}
          </p>

          {/* Real, computable status instead of fabricated "AI Confidence" /
              "JuPedSim Validated" claims that had no backing calculation. */}
          <div className="mt-2 flex flex-col items-center gap-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#7C6CFF]/15 text-[#7C6CFF] border border-[#7C6CFF]/30 font-mono-num font-bold text-[10px]">
              Zones Reporting Activity: {reportingZonesCount} / {cleanZones.length}
            </span>
          </div>

          <button
            onClick={onNavigateToAlerts}
            className="mt-3 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>Review Sentinel AI Analysis</span>
          </button>
        </div>

        {/* Right 2 Columns: Recharts 5-Min Live Density Trend + Prediction */}
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800/80 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-white font-semibold text-base">
                5-Minute Live Density Trend
              </h3>
              <p className="text-xs text-white/50">
                Sampled every 15s from live zone telemetry (p/m²), 4.0 p/m² safety threshold.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono-num">
              <span className="flex items-center gap-1.5 text-[#06b6d4]">
                <span className="w-3 h-3 rounded-full bg-[#06b6d4]" /> Mean Density
              </span>
              <span className="flex items-center gap-1.5 text-[#f43f5e]">
                <span className="w-3 h-3 rounded-full bg-[#f43f5e]" /> Predicted Risk
              </span>
            </div>
          </div>

          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="predictedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={11} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} domain={[0, (dataMax: number) => Math.max(5, dataMax + 1)]} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#111827', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <ReferenceLine y={4.0} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: 'CRITICAL SAFETY THRESHOLD (4.0 p/m²)', fill: '#f43f5e', fontSize: 10, position: 'insideTopRight' }} />
                <Area type="monotone" dataKey="meanDensity" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#currentGrad)" name="Mean Density" isAnimationActive={false} />
                <Area type="monotone" dataKey="predicted" stroke="#f43f5e" strokeWidth={3} strokeDasharray="5 5" fillOpacity={1} fill="url(#predictedGrad)" name="Predicted Risk" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Risk Zones Table */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-xl p-5 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold text-base">
              Sector Risk & Density Matrix
            </h3>
            <p className="text-xs text-white/50">
              Real-time telemetry breakdown by venue zone.
            </p>
          </div>
          <span className="text-xs font-mono-num text-white/50">
            {cleanZones.length} zones · Live Sync
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-body table-fixed">
            <thead>
              <tr className="border-b border-white/10 text-white/50 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3 w-24">Zone Code</th>
                <th className="py-3 px-3 w-64">Zone Name</th>
                <th className="py-3 px-3 w-32">Density (p/m²)</th>
                <th className="py-3 px-3 w-36">Active Headcount</th>
                <th className="py-3 px-3 w-28">Flow Rate</th>
                <th className="py-3 px-3 w-40">Status Risk</th>
                <th className="py-3 px-3 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {cleanZones.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-white/50">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Radio className="w-6 h-6 text-[#06b6d4] animate-pulse" />
                      <span className="font-heading font-bold text-sm text-white">Awaiting Edge Telemetry...</span>
                      <span className="text-[11px] text-white/50">
                        No active database zones loaded yet. Telemetry from YOLO pipeline will auto-populate live zones here.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                cleanZones.map((zone) => {
                  // Prefer real backend-computed flags if the zone object carries
                  // them (requires telemetry.py's WS payload + VenueZone type to
                  // include reverseFlowDetected/flowConflict — see note below).
                  // Falls back to the old density-based heuristic only if those
                  // fields aren't present yet, so this doesn't break before the
                  // backend/type changes are made.
                  const z: any = zone;
                  const reverseFlow = z.reverseFlowDetected !== undefined
                    ? z.reverseFlowDetected
                    : zone.density >= 3.5;
                  const flowConflict = z.flowConflict !== undefined
                    ? z.flowConflict
                    : (zone.riskScore > 50 && zone.density < 3.5);

                  return (
                    <tr key={zone.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 font-mono-num font-bold text-white truncate">
                        {zone.code}
                      </td>
                      <td className="py-3 px-3 font-bold text-white">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{zone.name}</span>
                            {reverseFlow && (
                              <span className="px-1.5 py-0.5 rounded bg-[#f43f5e]/15 text-[#f43f5e] text-[9px] font-bold border border-[#f43f5e]/30 animate-pulse whitespace-nowrap">
                                ⚠ Reverse Flow
                              </span>
                            )}
                            {flowConflict && !reverseFlow && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 text-[9px] font-bold border border-amber-500/30 whitespace-nowrap">
                                ⚠ Flow Conflict
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-normal text-white/50">
                            {zone.sector}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono-num font-bold text-sm">
                        <span className={zone.density >= 4.0 ? 'text-[#f43f5e]' : zone.density >= 3.0 ? 'text-amber-500' : 'text-white'}>
                          {zone.density} p/m²
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono-num">
                        {(zone.currentHeadcount ?? 0).toLocaleString()} / {(zone.maxCapacity ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 font-mono-num">
                        <div className="flex items-center gap-1">
                          <span>{zone.flowRate} p/min</span>
                          {zone.trend === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-[#f43f5e]" />}
                          {zone.trend === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-[#22D3A6]" />}
                          {zone.trend === 'stable' && <Minus className="w-3.5 h-3.5 text-gray-400" />}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {getRiskLevelBadge(zone.riskLevel, zone.riskScore)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={onNavigateToMap}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-[#06b6d4] cursor-pointer whitespace-nowrap"
                        >
                          Map View ➔
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Terminal-Style Audit Trail Log Component */}
      <div className="bg-[#151726] border border-white/10 rounded-2xl p-5 shadow-lg flex flex-col gap-3 font-mono-num text-xs text-white">
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22D3A6] animate-pulse" />
            <span className="font-heading font-bold text-xs uppercase tracking-wider text-[#22D3A6]">
              Operator Action & System Audit Trail Terminal
            </span>
          </div>
          <span className="text-[10px] text-white/50 uppercase">
            SECURE AUDIT LOG
          </span>
        </div>

        {/* Scrolling Terminal Window */}
        <div className="bg-black/60 border border-white/10 rounded-xl p-3 h-36 overflow-y-auto space-y-1.5 text-[11px] font-mono">
          {recentLogs && recentLogs.length > 0 ? (
            recentLogs.map((log, i) => (
              <div key={i} className={log.type === 'warning' ? 'text-amber-300' : log.type === 'success' ? 'text-[#22D3A6]' : 'text-white/70'}>
                [{log.timestamp}] - <span className="text-[#38BDF8]">{log.source}</span> - {log.action}
              </div>
            ))
          ) : (
            <div className="text-white/40 animate-pulse">Waiting for system events...</div>
          )}
        </div>
      </div>
    </div>
  );
};