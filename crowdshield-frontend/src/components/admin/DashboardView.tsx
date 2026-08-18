import React, { useState, useEffect } from 'react';
import { VenueZone, CrowdAlert, RiskLevel, VenueInfo, SupportedLanguage } from '../../types';
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
import { t } from '../../i18n/dashboard';
const isLegacyPhantomZone = (id: string): boolean => /^z-0?\d$/i.test(id || '');
interface DashboardViewProps {
  selectedVenue?: VenueInfo | null;
  zones: VenueZone[];
  alerts: CrowdAlert[];
  isScenarioActive: boolean;
  onNavigateToMap: () => void;
  onNavigateToAlerts: () => void;
  onOpenEmergencyBroadcast: () => void;
  recentLogs?: { timestamp: string; action: string; source: string; type: 'success' | 'warning' | 'info' }[];
  language?: SupportedLanguage;
}
export const DashboardView: React.FC<DashboardViewProps> = ({
  selectedVenue,
  zones,
  alerts,
  isScenarioActive,
  onNavigateToMap,
  onNavigateToAlerts,
  onOpenEmergencyBroadcast,
  recentLogs,
  language = 'en',
}) => {
  const L = language;
  const cleanZones = React.useMemo(() => {
    return zones.filter((z) => {
      if (isLegacyPhantomZone(z.id)) return false;
      const venueId = (z as any).venue_id || (z as any).venueId;
      if (selectedVenue?.id && venueId) {
        return venueId === selectedVenue.id;
      }
      const isKalingaSelected = selectedVenue?.id?.includes('kalinga') || selectedVenue?.name?.includes('Kalinga');
      if (isKalingaSelected) {
        return z.id.startsWith('ks_');
      }
      return !z.id.startsWith('ks_');
    });
  }, [zones, selectedVenue]);
  const totalHeadcount = cleanZones.reduce((acc, z) => acc + (z.currentHeadcount ?? 0), 0);
  const totalMaxCapacity = cleanZones.reduce((acc, z) => acc + (z.maxCapacity ?? 500), 0);
  const campusLoadPercent = totalMaxCapacity > 0 ? Math.min(100, Math.round((totalHeadcount / totalMaxCapacity) * 100)) : 0;
  const [trendData, setTrendData] = useState<
    { time: string; meanDensity: number; predicted: number; totalHeadcount: number }[]
  >([]);
  const zonesRef = React.useRef(cleanZones);
  useEffect(() => {
    zonesRef.current = cleanZones;
  }, [cleanZones]);
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
  const totalZoneRisk = cleanZones.reduce((acc, z) => acc + (z.riskScore || 0), 0);
  const averageZoneRisk = cleanZones.length > 0 ? Math.round(totalZoneRisk / cleanZones.length) : 0;
  const venueRiskScore = averageZoneRisk;
  const reportingZonesCount = cleanZones.filter((z) => (z.currentHeadcount ?? 0) > 0).length;
  const hasLiveTelemetry = reportingZonesCount > 0;
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-rose-50 text-rose-600 border border-rose-200 shadow-sm whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            {t('riskCritical', L)} · {score}%
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-orange-50 text-orange-600 border border-orange-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            {t('riskHigh', L)} · {score}%
          </span>
        );
      case 'caution':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-amber-50 text-amber-600 border border-amber-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {t('riskModerate', L)} · {score}%
          </span>
        );
      case 'safe':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold font-mono bg-emerald-50 text-emerald-600 border border-emerald-200 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {t('riskSafe', L)} · {score}%
          </span>
        );
    }
  };
  return (
    <div className="bg-[#FAFAF7] min-h-screen text-slate-900 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 lg:gap-8 font-body">
      {/* ── Top Row: Footfall & Safety Status ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        {/* Real-time Headcount Focus Card */}
        <div className="xl:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#67b2b9]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-opacity duration-500 group-hover:opacity-100 opacity-60" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-gradient-to-br from-[#67b2b9]/20 to-[#648d6a]/20 border border-[#67b2b9]/30 text-[#648d6a] rounded-2xl shadow-inner">
                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-[11px] font-bold font-mono text-slate-500 uppercase tracking-widest">{t('liveCampusFootfall', L)}</span>
                <h2 className="text-base sm:text-lg font-heading font-black text-slate-900 tracking-tight">{t('aggregatedAttendance', L)}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
              <span className="text-slate-600 font-mono font-bold text-[10px] sm:text-xs tracking-wider">
                {reportingZonesCount} / {cleanZones.length} {t('nodesActive', L).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="py-6 sm:py-8 flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
            <div className="flex flex-col gap-3">
              <div className="flex items-baseline gap-3">
                <span className="text-6xl sm:text-7xl lg:text-8xl font-black font-mono tracking-tighter text-slate-900 leading-none">
                  {totalHeadcount.toLocaleString()}
                </span>
                <span className="text-xs sm:text-sm font-mono font-bold text-slate-400">/ {totalMaxCapacity.toLocaleString()} {t('paxMax', L)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
                {trendData.length > 1 ? (
                  <span className={`inline-flex items-center gap-1.5 font-mono font-bold text-[10px] sm:text-xs px-3 py-1.5 rounded-xl border shadow-sm ${
                    headcountPercentChange > 0 
                      ? 'bg-rose-50 text-rose-600 border-rose-200' 
                      : headcountPercentChange < 0 
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}>
                    {headcountPercentChange > 0 ? <TrendingUp className="w-4 h-4" /> : headcountPercentChange < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    {headcountPercentChange > 0 ? '+' : ''}{headcountPercentChange}% {t('overLast5m', L)}
                  </span>
                ) : (
                  <span className="text-xs font-mono font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    {t('sampling5mBaseline', L)}
                  </span>
                )}
                <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                  {t('loadLevel', L)}: <strong className="text-slate-900 ml-1">{campusLoadPercent}%</strong>
                </span>
              </div>
            </div>
            {/* Brand Gradient Progress Bar */}
            <div className="w-full md:w-64 flex flex-col gap-2 shrink-0 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex justify-between text-[11px] font-mono font-black uppercase tracking-wider">
                <span className="text-slate-500">{t('capacityUtilization', L)}</span>
                <span className={campusLoadPercent >= 80 ? 'text-rose-500' : campusLoadPercent >= 50 ? 'text-amber-500' : 'text-[#648d6a]'}>
                  {campusLoadPercent}%
                </span>
              </div>
              <div className="w-full h-3 sm:h-4 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                    campusLoadPercent >= 80 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 
                    campusLoadPercent >= 50 ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 
                    'bg-gradient-to-r from-[#67b2b9] to-[#648d6a] shadow-[0_0_10px_rgba(103,178,185,0.5)]'
                  }`}
                  style={{ width: `${campusLoadPercent}%` }}
                />
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] sm:text-xs font-mono text-slate-400 font-bold uppercase tracking-wider relative z-10">
            <span className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#67b2b9]" /> {t('yoloEdgeProcessing', L)}
            </span>
            <span className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
              {t('refreshInterval', L)}: <strong className="text-slate-700 ml-1">{t('telemetry15s', L)}</strong>
            </span>
          </div>
        </div>
        {/* AI Safety Index Gauge Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 relative z-10">
            <span className="text-[10px] sm:text-[11px] font-black font-mono text-slate-500 uppercase tracking-widest">{t('safetyStatus', L)}</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 font-mono text-[9px] sm:text-[10px] font-bold tracking-wider">
              SENTINEL v3.4
            </span>
          </div>
          <div className="py-6 sm:py-8 flex flex-col items-center justify-center text-center relative z-10">
            <div className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full border-8 flex flex-col items-center justify-center bg-white shadow-xl my-2 transition-all duration-500 ${
              venueRiskScore >= 80 ? 'border-rose-500 text-rose-500 shadow-rose-500/20' :
              venueRiskScore >= 50 ? 'border-amber-500 text-amber-600 shadow-amber-500/20' :
              'border-[#67b2b9] text-[#648d6a] shadow-[#67b2b9]/20'
            }`}>
              <span className="font-mono font-black text-4xl sm:text-5xl tracking-tighter">{venueRiskScore}%</span>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest mt-1">
                {venueRiskScore >= 80 ? t('critical', L) : venueRiskScore >= 50 ? t('warning', L) : t('secure', L)}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-mono font-medium text-slate-500 mt-4 max-w-[200px] leading-relaxed">
              {venueRiskScore >= 80 
                ? t('highCrowdCrush', L) 
                : t('campusSafe', L)}
            </p>
          </div>
          <button
            onClick={onNavigateToAlerts}
            className="w-full py-3 sm:py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-800 rounded-2xl font-heading font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-200 active:scale-95 shadow-sm relative z-10"
          >
            <Sparkles className="w-4 h-4 text-[#67b2b9]" />
            <span>{t('inspectSentinel', L)}</span>
          </button>
        </div>
      </div>
      {/* ── Middle Row: Sector Risk Distribution & Recharts Density Stream ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 lg:gap-8">
        {/* Left Column: Sector Risk Distribution List */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <span className="text-[10px] sm:text-[11px] font-black font-mono text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#67b2b9]" /> {t('sectorRiskDistribution', L)}
              </span>
              <span className="text-[10px] font-mono font-bold bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 text-slate-600">{cleanZones.length} {t('sectors', L)}</span>
            </div>
            <div className="mt-5 flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-2 smooth-scroll">
              {cleanZones.length > 0 ? (
                cleanZones.map((z) => {
                  const isHigh = z.riskLevel === 'critical' || z.riskLevel === 'warning';
                  return (
                    <div 
                      key={z.id}
                      className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between text-xs sm:text-sm font-mono transition-all hover:shadow-md ${
                        isHigh ? 'bg-rose-50/50 border-rose-200 text-slate-900' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {isHigh ? <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 shrink-0" /> : <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 shrink-0" />}
                        <span className="font-bold truncate max-w-[120px] sm:max-w-[150px]">{z.name}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="font-black tracking-tight">{z.density.toFixed(1)} <span className="text-[10px] text-slate-400 font-bold">p/m²</span></span>
                        {getRiskLevelBadge(z.riskLevel, z.riskScore)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-xs text-slate-400 font-mono font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">{t('noActiveZones', L)}</div>
              )}
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100 text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>{t('graphPathfinderActive', L)}</span>
            <span className="text-emerald-500 bg-emerald-50 px-2 py-1 rounded-md">{t('aStarReroutingReady', L)}</span>
          </div>
        </div>
        {/* Right 2 Columns: Recharts 5-Minute Live Density Stream */}
        <div className="xl:col-span-2 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
            <div>
              <h3 className="text-slate-900 font-heading font-black text-base sm:text-lg flex items-center gap-2.5 tracking-tight">
                <span>{t('fiveMinDensityStream', L)}</span>
                <span className="px-2.5 py-1 rounded-lg bg-[#67b2b9]/10 text-[#648d6a] border border-[#67b2b9]/20 text-[9px] sm:text-[10px] font-mono font-black uppercase tracking-widest">
                  {t('densityUnit', L)}
                </span>
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-500 font-mono font-medium mt-1">
                {t('samplingDescription', L)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[10px] sm:text-xs font-mono font-bold tracking-wider uppercase bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
              <span className="flex items-center gap-2 text-[#67b2b9]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#67b2b9] shadow-sm" /> {t('meanDensity', L)}
              </span>
              <span className="flex items-center gap-2 text-rose-500">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm animate-pulse" /> {t('predictedRisk', L)}
              </span>
            </div>
          </div>
          <div className="h-64 sm:h-72 w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="currentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#67b2b9" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#67b2b9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="predictedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} fontFamily="monospace" />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[0, (dataMax: number) => Math.max(5, dataMax + 1)]} tickLine={false} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  itemStyle={{ color: '#0f172a' }}
                />
                <ReferenceLine y={4.0} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: t('criticalThreshold', L).toUpperCase(), fill: '#f43f5e', fontSize: 9, fontWeight: 'bold', position: 'insideTopRight', fontFamily: 'monospace' }} />
                <Area type="monotone" dataKey="meanDensity" stroke="#67b2b9" strokeWidth={3} fillOpacity={1} fill="url(#currentGrad)" name={t('meanDensity', L)} isAnimationActive={false} />
                <Area type="monotone" dataKey="predicted" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" fillOpacity={1} fill="url(#predictedGrad)" name={t('predictedRisk', L)} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* ── Sector Risk & Density Matrix Table ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
          <div>
            <h3 className="text-slate-900 font-heading font-black text-base sm:text-lg flex items-center gap-3 tracking-tight">
              <span>{t('sectorRiskDensityMatrix', L)}</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-mono font-bold uppercase tracking-widest">
                {cleanZones.length} {t('venueZones', L)}
              </span>
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-500 font-mono font-medium mt-1">
              {t('liveSpatialTelemetry', L)}
            </p>
          </div>
        </div>
        <div className="overflow-x-auto smooth-scroll rounded-xl border border-slate-100">
          <table className="w-full text-left text-xs sm:text-sm font-mono whitespace-nowrap min-w-[800px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[9px] sm:text-[10px]">
                <th className="py-4 px-5">{t('thCode', L)}</th>
                <th className="py-4 px-5">{t('thCampusSector', L)}</th>
                <th className="py-4 px-5">{t('thDensity', L)}</th>
                <th className="py-4 px-5">{t('thHeadcountLoad', L)}</th>
                <th className="py-4 px-5">{t('thFlowTrend', L)}</th>
                <th className="py-4 px-5">{t('thThreatStatus', L)}</th>
                <th className="py-4 px-5 text-right">{t('thAction', L)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cleanZones.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400 bg-white">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Radio className="w-8 h-8 text-[#67b2b9] animate-pulse" />
                      <span className="font-heading font-black text-base text-slate-800 tracking-tight">{t('awaitingEdgeTelemetry', L)}</span>
                      <span className="text-[11px] font-mono max-w-sm whitespace-normal">
                        {t('noActiveDbZones', L)}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                cleanZones.map((zone) => {
                  const z: any = zone;
                  const reverseFlow = z.reverseFlowDetected !== undefined ? z.reverseFlowDetected : zone.density >= 3.5;
                  const flowConflict = z.flowConflict !== undefined ? z.flowConflict : (zone.riskScore > 50 && zone.density < 3.5);
                  return (
                    <tr key={zone.id} className="hover:bg-slate-50/80 transition-colors bg-white">
                      <td className="py-4 px-5 font-black text-slate-900">
                        {zone.code}
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800">{zone.name}</span>
                            {reverseFlow && (
                              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 text-[9px] font-bold border border-rose-200 animate-pulse tracking-widest uppercase">
                                {t('reverseFlow', L)}
                              </span>
                            )}
                            {flowConflict && !reverseFlow && (
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 text-[9px] font-bold border border-amber-200 tracking-widest uppercase">
                                {t('flowConflict', L)}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-slate-400 tracking-wide">
                            {zone.sector}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5 font-black text-sm">
                        <span className={zone.density >= 4.0 ? 'text-rose-600' : zone.density >= 3.0 ? 'text-amber-600' : 'text-slate-800'}>
                          {zone.density.toFixed(2)} <span className="text-[10px] font-bold text-slate-400">p/m²</span>
                        </span>
                      </td>
                      <td className="py-4 px-5 text-slate-700 font-bold">
                        {(zone.currentHeadcount ?? 0).toLocaleString()} <span className="text-slate-400 font-medium">/ {(zone.maxCapacity ?? 0).toLocaleString()}</span>
                      </td>
                      <td className="py-4 px-5 text-slate-700 font-bold">
                        <div className="flex items-center gap-2">
                          <span>{zone.flowRate} <span className="text-[10px] font-bold text-slate-400">p/min</span></span>
                          {zone.trend === 'up' && <ArrowUpRight className="w-4 h-4 text-rose-500" />}
                          {zone.trend === 'down' && <ArrowDownRight className="w-4 h-4 text-emerald-500" />}
                          {zone.trend === 'stable' && <Minus className="w-4 h-4 text-slate-400" />}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        {getRiskLevelBadge(zone.riskLevel, zone.riskScore)}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <button
                          onClick={onNavigateToMap}
                          className="px-4 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-[#67b2b9] cursor-pointer transition-all active:scale-95 shadow-sm tracking-wider uppercase"
                        >
                          {t('inspectNode', L)}
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
      {/* ── Terminal Audit Feed ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col gap-4 font-mono text-xs text-slate-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg text-[#67b2b9] shadow-inner">
              <Terminal className="w-5 h-5" />
            </div>
            <span className="font-black text-sm sm:text-base uppercase tracking-widest text-white">
              {t('operationsAuditFeed', L)}
            </span>
          </div>
          <span className="text-[10px] sm:text-xs text-slate-500 font-bold tracking-wider bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            {t('liveEdgeLogging', L).toUpperCase()}
          </span>
        </div>
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 sm:p-5 h-48 overflow-y-auto space-y-2.5 text-[11px] sm:text-xs select-text shadow-inner">
          {recentLogs && recentLogs.length > 0 ? (
            recentLogs.map((log, i) => (
              <div key={i} className={`flex items-start gap-3 leading-relaxed transition-colors hover:bg-slate-800/50 p-1.5 rounded-lg ${
                log.type === 'warning' ? 'text-amber-400 font-bold' : log.type === 'success' ? 'text-emerald-400 font-bold' : 'text-slate-300 font-medium'
              }`}>
                <span className="text-slate-600 select-none font-black text-sm leading-none mt-0.5">›</span>
                <span className="text-slate-500 font-bold shrink-0">[{log.timestamp}]</span>
                <span className="text-[#67b2b9] font-black shrink-0 tracking-wider">[{log.source}]</span>
                <span className="truncate">{log.action}</span>
              </div>
            ))
          ) : (
            <div className="text-slate-600 italic flex items-center h-full justify-center opacity-70">
              <span className="animate-pulse">{t('listeningForEvents', L)}...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};