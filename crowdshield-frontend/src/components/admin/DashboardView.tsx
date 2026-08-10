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
  Radio,
  Sparkles,
  Layers,
  Terminal,
  Cpu,
  CheckCircle2
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

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
  // Real zones only — legacy mock zones filtered out
  const cleanZones = zones.filter((z) => !isLegacyPhantomZone(z.id));
  const totalHeadcount = cleanZones.reduce((acc, z) => acc + (z.currentHeadcount ?? 0), 0);
  const totalMaxCapacity = cleanZones.reduce((acc, z) => acc + (z.maxCapacity ?? 500), 0);
  const campusLoadPercent = totalMaxCapacity > 0 ? Math.min(100, Math.round((totalHeadcount / totalMaxCapacity) * 100)) : 0;

  // Dynamic Trend Chart state sampled from live `cleanZones`
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

  // Scheduled sampling — 15s x 20 samples
  useEffect(() => {
    sample();
    const interval = setInterval(sample, 15000);
    return () => clearInterval(interval);
  }, [sample]);

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

  // Aggregate Metrics
  const totalZoneRisk = cleanZones.reduce((acc, z) => acc + (z.riskScore || 0), 0);
  const averageZoneRisk = cleanZones.length > 0 ? Math.round(totalZoneRisk / cleanZones.length) : 0;
  const venueRiskScore = averageZoneRisk;

  const reportingZonesCount = cleanZones.filter((z) => (z.currentHeadcount ?? 0) > 0).length;
  const hasLiveTelemetry = reportingZonesCount > 0;

  // Real percent change over the sampled window
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono-num bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B5C] animate-ping" />
            CRITICAL · {score}%
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono-num bg-[#FF7A45]/15 text-[#FF7A45] border border-[#FF7A45]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A45]" />
            HIGH · {score}%
          </span>
        );
      case 'caution':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono-num bg-[#FFB627]/15 text-[#D97706] border border-[#FFB627]/40">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFB627]" />
            MODERATE · {score}%
          </span>
        );
      case 'safe':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono-num bg-[#22D3A6]/20 text-[#059669] border border-[#22D3A6]/40">
            <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
            SAFE · {score}%
          </span>
        );
    }
  };

  return (
    <div className="bg-[#FAFAF7] min-h-screen text-[#151726] p-4 sm:p-6 flex flex-col gap-5 font-body selection:bg-[#2C7BE5]/20">
      
      {/* No Live Telemetry Warning Banner */}
      {!hasLiveTelemetry && (
        <div className="bg-[#FFB627]/15 border border-[#FFB627]/40 rounded-2xl p-3.5 flex items-center gap-3 text-[#B45309] text-xs font-mono-num shadow-xs">
          <Radio className="w-4 h-4 animate-pulse flex-shrink-0 text-[#D97706]" />
          <span>
            Awaiting camera telemetry feed across <strong>{cleanZones.length} campus zones</strong>. Running on baseline hardware telemetry until YOLO video pipelines or crisis simulations connect.
          </span>
        </div>
      )}

      {/* Hero Footfall & Safety Status Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Real-time Headcount Focus Card */}
        <div className="lg:col-span-2 bg-white border border-[#E7E5DD] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#E7E5DD] pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-[#2C7BE5]/10 border border-[#2C7BE5]/20 text-[#2C7BE5] rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold font-mono-num text-[#5B5F73] uppercase tracking-wider">Live Campus Footfall</span>
                <h2 className="text-sm font-heading font-bold text-[#151726]">Aggregated Real-Time Attendance</h2>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono-num text-xs">
              <span className="w-2 h-2 rounded-full bg-[#059669] animate-ping" />
              <span className="text-[#5B5F73] font-bold">{reportingZonesCount} / {cleanZones.length} Nodes Active</span>
            </div>
          </div>

          <div className="py-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl sm:text-6xl font-black font-mono-num tracking-tight text-[#151726]">
                  {totalHeadcount.toLocaleString()}
                </span>
                <span className="text-xs font-mono-num text-[#5B5F73]">/ {totalMaxCapacity.toLocaleString()} Pax Max</span>
              </div>

              <div className="mt-2 flex items-center gap-3">
                {trendData.length > 1 ? (
                  <span className={`inline-flex items-center gap-1 font-mono-num font-bold text-xs px-2.5 py-1 rounded-lg ${
                    headcountPercentChange > 0 
                      ? 'bg-[#FF3B5C]/15 text-[#FF3B5C] border border-[#FF3B5C]/30' 
                      : headcountPercentChange < 0 
                      ? 'bg-[#22D3A6]/20 text-[#059669] border border-[#22D3A6]/40' 
                      : 'bg-[#FAFAF7] text-[#5B5F73] border border-[#E7E5DD]'
                  }`}>
                    {headcountPercentChange > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : headcountPercentChange < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                    {headcountPercentChange > 0 ? '+' : ''}{headcountPercentChange}% over last 5m
                  </span>
                ) : (
                  <span className="text-xs font-mono-num text-[#5B5F73]">Sampling 5m baseline...</span>
                )}
                <span className="text-xs font-mono-num text-[#5B5F73]">
                  Load Level: <strong className="text-[#151726]">{campusLoadPercent}%</strong>
                </span>
              </div>
            </div>

            {/* Capacity Utilization Progress Bar */}
            <div className="w-full sm:w-48 flex flex-col gap-1.5 self-end">
              <div className="flex justify-between text-[11px] font-mono-num font-bold">
                <span className="text-[#5B5F73]">Capacity Utilization</span>
                <span className={campusLoadPercent >= 80 ? 'text-[#FF3B5C]' : campusLoadPercent >= 50 ? 'text-[#D97706]' : 'text-[#059669]'}>
                  {campusLoadPercent}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-[#FAFAF7] border border-[#E7E5DD] rounded-full overflow-hidden p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    campusLoadPercent >= 80 ? 'bg-[#FF3B5C]' : campusLoadPercent >= 50 ? 'bg-[#FFB627]' : 'bg-gradient-to-r from-[#2C7BE5] to-[#22D3A6]'
                  }`}
                  style={{ width: `${campusLoadPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E7E5DD] flex items-center justify-between text-xs font-mono-num text-[#5B5F73]">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#2C7BE5]" /> YOLO Edge Processing Active
            </span>
            <span>
              Refresh Interval: <strong className="text-[#151726]">15s Telemetry</strong>
            </span>
          </div>
        </div>

        {/* AI Safety Index Gauge Card */}
        <div className="bg-white border border-[#E7E5DD] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-[#E7E5DD] pb-3.5">
            <span className="text-[11px] font-bold font-mono-num text-[#5B5F73] uppercase tracking-wider">Safety Status</span>
            <span className="px-2 py-0.5 rounded bg-[#FAFAF7] text-[#151726] border border-[#E7E5DD] font-mono-num text-[10px] font-bold">
              Sentinel Engine v3.4
            </span>
          </div>

          <div className="py-4 flex flex-col items-center justify-center text-center">
            <div className={`w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center bg-[#FAFAF7] shadow-sm my-2 transition-all ${
              venueRiskScore >= 80 ? 'border-[#FF3B5C] text-[#FF3B5C] animate-pulse' :
              venueRiskScore >= 50 ? 'border-[#FFB627] text-[#D97706]' :
              'border-[#22D3A6] text-[#059669]'
            }`}>
              <span className="font-mono-num font-black text-3xl">{venueRiskScore}%</span>
              <span className="text-[9px] font-bold uppercase tracking-wider mt-0.5">
                {venueRiskScore >= 80 ? 'CRITICAL' : venueRiskScore >= 50 ? 'WARNING' : 'SECURE'}
              </span>
            </div>

            <p className="text-xs font-mono-num text-[#5B5F73] mt-2 max-w-xs">
              {venueRiskScore >= 80 
                ? 'High crowd crush threat detected. Immediate dispatch required.' 
                : 'Campus density within safe operational parameters.'}
            </p>
          </div>

          <button
            onClick={onNavigateToAlerts}
            className="w-full py-2.5 bg-[#FAFAF7] hover:bg-[#E7E5DD] text-[#151726] rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-[#E7E5DD]"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#2C7BE5]" />
            <span>Inspect Sentinel Intelligence</span>
          </button>
        </div>

      </div>

      {/* Middle Row: Sector Risk Distribution & Recharts Density Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Left Column: Sector Risk Distribution List */}
        <div className="bg-white border border-[#E7E5DD] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#E7E5DD] pb-3">
              <span className="text-xs font-bold font-mono-num text-[#5B5F73] uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#2C7BE5]" /> Sector Risk Distribution
              </span>
              <span className="text-[10px] font-mono-num text-[#5B5F73]">{cleanZones.length} Sectors</span>
            </div>

            <div className="mt-4 flex flex-col gap-2.5">
              {cleanZones.length > 0 ? (
                cleanZones.map((z) => {
                  const isHigh = z.riskLevel === 'critical' || z.riskLevel === 'warning';
                  return (
                    <div 
                      key={z.id}
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs font-mono-num transition-all ${
                        isHigh ? 'bg-[#FF3B5C]/10 border-[#FF3B5C]/30 text-[#151726]' : 'bg-[#FAFAF7] border-[#E7E5DD] text-[#151726]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isHigh ? <AlertTriangle className="w-4 h-4 text-[#FF3B5C] shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />}
                        <span className="font-bold truncate">{z.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 font-bold">
                        <span>{z.density.toFixed(1)} p/m²</span>
                        {getRiskLevelBadge(z.riskLevel, z.riskScore)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-[#5B5F73] font-mono-num">No active zones initialized.</div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E7E5DD] text-[11px] font-mono-num text-[#5B5F73] flex justify-between">
            <span>Graph Pathfinder: Active</span>
            <span className="text-[#059669] font-bold">A* Rerouting Ready</span>
          </div>
        </div>

        {/* Right 2 Columns: Recharts 5-Minute Live Density Trend (Light Theme) */}
        <div className="lg:col-span-2 bg-white border border-[#E7E5DD] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E7E5DD] pb-3 gap-2">
            <div>
              <h3 className="text-[#151726] font-heading font-bold text-sm sm:text-base flex items-center gap-2">
                <span>5-Minute Live Density Stream</span>
                <span className="px-2 py-0.5 rounded bg-[#2C7BE5]/10 text-[#2C7BE5] border border-[#2C7BE5]/20 text-[10px] font-mono-num font-bold uppercase">
                  p/m² Density
                </span>
              </h3>
              <p className="text-xs text-[#5B5F73] font-mono-num mt-0.5">
                Sampling 15s updates with 4.0 p/m² critical threshold marker
              </p>
            </div>
            
            <div className="flex items-center gap-3 text-xs font-mono-num">
              <span className="flex items-center gap-1.5 text-[#2C7BE5]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#2C7BE5]" /> Mean Density
              </span>
              <span className="flex items-center gap-1.5 text-[#FF3B5C]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B5C]" /> Predicted Risk
              </span>
            </div>
          </div>

          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2C7BE5" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2C7BE5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="predictedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF3B5C" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#FF3B5C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#5B5F73" fontSize={10} tickLine={false} />
                <YAxis stroke="#5B5F73" fontSize={10} domain={[0, (dataMax: number) => Math.max(5, dataMax + 1)]} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #E7E5DD', color: '#151726', fontSize: '11px', fontFamily: 'monospace', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: '#151726' }}
                />
                <ReferenceLine y={4.0} stroke="#FF3B5C" strokeDasharray="4 4" label={{ value: 'CRITICAL SAFETY THRESHOLD (4.0 p/m²)', fill: '#FF3B5C', fontSize: 10, position: 'insideTopRight' }} />
                <Area type="monotone" dataKey="meanDensity" stroke="#2C7BE5" strokeWidth={2.5} fillOpacity={1} fill="url(#currentGrad)" name="Mean Density" isAnimationActive={false} />
                <Area type="monotone" dataKey="predicted" stroke="#FF3B5C" strokeWidth={2.5} strokeDasharray="5 5" fillOpacity={1} fill="url(#predictedGrad)" name="Predicted Risk" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Sector Risk & Density Matrix Table (Light Theme) */}
      <div className="bg-white border border-[#E7E5DD] rounded-2xl p-5 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E7E5DD] pb-3 gap-2">
          <div>
            <h3 className="text-[#151726] font-heading font-bold text-base flex items-center gap-2">
              <span>Sector Risk & Density Matrix</span>
              <span className="px-2 py-0.5 rounded bg-[#FAFAF7] text-[#151726] border border-[#E7E5DD] text-[10px] font-mono-num font-bold">
                {cleanZones.length} Venue Zones
              </span>
            </h3>
            <p className="text-xs text-[#5B5F73] font-mono-num mt-0.5">
              Live spatial telemetry breakdown per physical campus sector
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-body table-fixed">
            <thead>
              <tr className="border-b border-[#E7E5DD] text-[#5B5F73] font-mono-num font-bold uppercase tracking-wider text-[10px] bg-[#FAFAF7]">
                <th className="py-3 px-3 w-24">Code</th>
                <th className="py-3 px-3 w-64">Campus Sector</th>
                <th className="py-3 px-3 w-32">Density</th>
                <th className="py-3 px-3 w-40">Headcount Load</th>
                <th className="py-3 px-3 w-28">Flow Trend</th>
                <th className="py-3 px-3 w-40">Threat Status</th>
                <th className="py-3 px-3 w-28 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5DD] font-mono-num">
              {cleanZones.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[#5B5F73]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Radio className="w-6 h-6 text-[#2C7BE5] animate-pulse" />
                      <span className="font-heading font-bold text-sm text-[#151726]">Awaiting Edge Telemetry...</span>
                      <span className="text-[11px] text-[#5B5F73]">
                        No active database zones loaded yet. Telemetry from YOLO pipeline will auto-populate live zones here.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                cleanZones.map((zone) => {
                  const z: any = zone;
                  const reverseFlow = z.reverseFlowDetected !== undefined
                    ? z.reverseFlowDetected
                    : zone.density >= 3.5;
                  const flowConflict = z.flowConflict !== undefined
                    ? z.flowConflict
                    : (zone.riskScore > 50 && zone.density < 3.5);

                  return (
                    <tr key={zone.id} className="hover:bg-[#FAFAF7] transition-colors">
                      <td className="py-3 px-3 font-bold text-[#151726]">
                        {zone.code}
                      </td>
                      <td className="py-3 px-3 font-bold text-[#151726]">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{zone.name}</span>
                            {reverseFlow && (
                              <span className="px-1.5 py-0.5 rounded bg-[#FF3B5C]/15 text-[#FF3B5C] text-[9px] font-bold border border-[#FF3B5C]/30 animate-pulse whitespace-nowrap">
                                ⚠ Reverse Flow
                              </span>
                            )}
                            {flowConflict && !reverseFlow && (
                              <span className="px-1.5 py-0.5 rounded bg-[#FFB627]/15 text-[#D97706] text-[9px] font-bold border border-[#FFB627]/30 whitespace-nowrap">
                                ⚠ Flow Conflict
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-normal text-[#5B5F73]">
                            {zone.sector}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-sm">
                        <span className={zone.density >= 4.0 ? 'text-[#FF3B5C]' : zone.density >= 3.0 ? 'text-[#D97706]' : 'text-[#151726]'}>
                          {zone.density.toFixed(2)} p/m²
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[#151726]">
                        {(zone.currentHeadcount ?? 0).toLocaleString()} / {(zone.maxCapacity ?? 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-[#151726]">
                        <div className="flex items-center gap-1">
                          <span>{zone.flowRate} p/min</span>
                          {zone.trend === 'up' && <ArrowUpRight className="w-3.5 h-3.5 text-[#FF3B5C]" />}
                          {zone.trend === 'down' && <ArrowDownRight className="w-3.5 h-3.5 text-[#059669]" />}
                          {zone.trend === 'stable' && <Minus className="w-3.5 h-3.5 text-[#5B5F73]" />}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        {getRiskLevelBadge(zone.riskLevel, zone.riskScore)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={onNavigateToMap}
                          className="px-2.5 py-1 rounded-lg bg-[#FAFAF7] hover:bg-[#E7E5DD] border border-[#E7E5DD] text-[11px] font-bold text-[#2C7BE5] cursor-pointer whitespace-nowrap transition-colors"
                        >
                          Inspect Node ➔
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

      {/* Terminal Audit Feed */}
      <div className="bg-white border border-[#E7E5DD] rounded-2xl p-5 shadow-xs flex flex-col gap-3 font-mono-num text-xs">
        <div className="flex items-center justify-between border-b border-[#E7E5DD] pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#2C7BE5]" />
            <span className="font-bold text-xs uppercase tracking-wider text-[#151726]">
              Operations & Command Audit Feed
            </span>
          </div>
          <span className="text-[10px] text-[#5B5F73]">Live Edge Logging</span>
        </div>

        <div className="bg-[#151726] text-white rounded-xl p-3.5 h-36 overflow-y-auto space-y-1.5 text-[11px] select-text">
          {recentLogs && recentLogs.length > 0 ? (
            recentLogs.map((log, i) => (
              <div key={i} className={`flex items-start gap-2 leading-relaxed ${
                log.type === 'warning' ? 'text-[#FFB627]' : log.type === 'success' ? 'text-[#22D3A6]' : 'text-slate-300'
              }`}>
                <span className="text-slate-600 select-none">›</span>
                <span className="text-slate-400 font-bold shrink-0">[{log.timestamp}]</span>
                <span className="text-[#38BDF8] font-bold shrink-0">[{log.source}]</span>
                <span className="truncate">{log.action}</span>
              </div>
            ))
          ) : (
            <div className="text-slate-500 italic">Listening for inbound edge events...</div>
          )}
        </div>
      </div>

    </div>
  );
};