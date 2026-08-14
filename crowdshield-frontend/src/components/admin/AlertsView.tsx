import React, { useState, useEffect } from 'react';
import { CrowdAlert, SupportedLanguage, CCTVFeed, VenueZone } from '../../types';
import api from '../../utils/api';
import { 
  Sparkles, 
  Volume2, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  Radio,
  X,
  Loader2,
  ImageOff
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { speakAnnouncement } from '../../utils/speech';

// ─── TEAM'S INTERFACES (100% UNTOUCHED) ───
interface InterventionResult {
  status: string;
  message: string;
  resolved_alerts_count: number;
}
interface BroadcastResult { original_text: string; translated_text: string; language: string; status: string; }

interface AlertsViewProps {
  alerts: CrowdAlert[];
  cctvFeeds: CCTVFeed[];
  zones: VenueZone[];
  selectedLanguage: SupportedLanguage;
  onChangeLanguage: (lang: SupportedLanguage) => void;
  onOpenEmergencyBroadcast: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  cctvFeeds,
  zones,
  selectedLanguage,
  onChangeLanguage,
  onOpenEmergencyBroadcast,
}) => {
  const [selectedAlertId, setSelectedAlertId] = useState<string>('');
  const [activeLang, setActiveLang] = useState<SupportedLanguage>(selectedLanguage);
  const [confirmationModalAction, setConfirmationModalAction] = useState<{
    actionText: string;
    impact: string;
    targetGateOrZone: string;
  } | null>(null);
  const [executedActionIds, setExecutedActionIds] = useState<string[]>([]);
  const [dispatchState, setDispatchState] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
  const [announcementText, setAnnouncementText] = useState('');
  const [broadcastState, setBroadcastState] = useState<{ loading: boolean; error: string | null; result: BroadcastResult | null }>({ loading: false, error: null, result: null });
  const [historyData, setHistoryData] = useState<{ time: string; density: number }[]>([]);

  // ─── TEAM'S LOGIC (100% UNTOUCHED) ───
  const activeVenueAlerts = alerts.filter(alert => {
    return zones.some(z => {
      const zid = (z.id || '').toLowerCase();
      const targetId = (alert.zoneId || '').toLowerCase();
      if (zid === targetId) return true;
      const zNum = parseInt(zid.replace(/\D/g, ''), 10);
      const targetNum = parseInt(targetId.replace(/\D/g, ''), 10);
      return !isNaN(zNum) && !isNaN(targetNum) && zNum === targetNum;
    });
  });

  useEffect(() => {
    if (activeVenueAlerts.length > 0) {
      if (!selectedAlertId || !activeVenueAlerts.find(a => a.id === selectedAlertId)) {
        setSelectedAlertId(activeVenueAlerts[0].id);
      }
    } else {
      if (selectedAlertId !== '') setSelectedAlertId('');
    }
  }, [alerts, zones, selectedAlertId]);

  const selectedAlert = activeVenueAlerts.find((a) => a.id === selectedAlertId) || activeVenueAlerts[0] || null;

  const activeZone = selectedAlert
    ? zones.find((z) => {
        const zid = (z.id || '').toLowerCase();
        const targetId = (selectedAlert.zoneId || '').toLowerCase();
        if (zid === targetId) return true;
        const zNum = parseInt(zid.replace(/\D/g, ''), 10);
        const targetNum = parseInt(targetId.replace(/\D/g, ''), 10);
        return !isNaN(zNum) && !isNaN(targetNum) && zNum === targetNum;
      })
    : null;

  const displayDensity = activeZone ? activeZone.density : (selectedAlert?.density || 0);
  const displayFlowRate = activeZone ? activeZone.flowRate : (selectedAlert?.flowRate || 0);

  const getStreamUrl = (zoneId?: string) => {
    if (!zoneId) return 'http://localhost:5000/video_feed';
    const feed = cctvFeeds.find(f => f.zoneId === zoneId);
    return feed?.imageUrl || 'http://localhost:5000/video_feed';
  };

  useEffect(() => {
    if (selectedAlert) {
      setAnnouncementText('');
      setBroadcastState({ loading: false, error: null, result: null });
    }
  }, [selectedAlert?.id]);

  useEffect(() => {
    if (!selectedAlert) return;
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/analytics/predictive-forecast/${selectedAlert.zoneId}`);
        if (res.status === 200 && res.data?.historical) {
          setHistoryData(res.data.historical);
        } else {
          throw new Error('Fallback required');
        }
      } catch (err) {
        setHistoryData((prev) => {
          const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const newPoint = { time: nowTime, density: Number(displayDensity.toFixed(2)) };
          if (prev.length > 0 && prev[prev.length - 1].density === newPoint.density) return prev;
          if (prev.length === 0 || prev[0].time.includes('m')) {
            const curr = displayDensity;
            return [
              { time: '-50s', density: Math.max(0, Number((curr * 0.4).toFixed(2))) },
              { time: '-40s', density: Math.max(0, Number((curr * 0.55).toFixed(2))) },
              { time: '-30s', density: Math.max(0, Number((curr * 0.7).toFixed(2))) },
              { time: '-20s', density: Math.max(0, Number((curr * 0.85).toFixed(2))) },
              { time: '-10s', density: Math.max(0, Number((curr * 0.95).toFixed(2))) },
              newPoint,
            ];
          }
          const nextData = [...prev, newPoint];
          if (nextData.length > 8) nextData.shift();
          return nextData;
        });
      }
    };
    fetchHistory();
  }, [selectedAlert?.id, displayDensity]); 

  const handleExecuteAction = async () => {
    if (!confirmationModalAction || !selectedAlert) return;
    setDispatchState({ loading: true, error: null });
    try {
      await api.post<InterventionResult>('/interventions/execute', {
        actionId: (confirmationModalAction as any).id,
        actionText: confirmationModalAction.actionText,
        zoneId: selectedAlert.zoneId,
        impact: confirmationModalAction.impact,
      });
      setExecutedActionIds((prev) => [...prev, confirmationModalAction.actionText]);
      setDispatchState({ loading: false, error: null });
      setConfirmationModalAction(null);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || (err?.request ? 'No response from server — check network/edge connectivity.' : 'Dispatch failed.');
      setDispatchState({ loading: false, error: detail });
    }
  };

  const handleBroadcast = async () => {
    if (!selectedAlert || !announcementText.trim()) return;
    setBroadcastState({ loading: true, error: null, result: null });
    try {
      const res = await api.post<BroadcastResult>('/broadcast/', {
        text: announcementText,
        target_language: activeLang,
        zone_id: selectedAlert.zoneId,
      });
      setBroadcastState({ loading: false, error: null, result: res.data });
      speakAnnouncement(res.data.translated_text, activeLang);
    } catch (err: any) {
      setBroadcastState({
        loading: false, result: null,
        error: err?.response?.status === 401 || err?.response?.status === 403
          ? 'Admin authentication required to broadcast.'
          : err?.response?.data?.detail || 'Broadcast failed — Sarvam AI service unreachable.',
      });
    }
  };

  // ─── UI RENDER ───
  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 lg:gap-8 font-body text-slate-800 bg-[#FAFAF7] min-h-screen">
      
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#67b2b9]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none opacity-60" />
        <div className="relative z-10">
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-slate-900 tracking-tight flex items-center gap-3">
            Alerts & Response Console
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-2 max-w-2xl leading-relaxed">
            Real-time incident queue integrated with Sentinel AI risk breakdown and Sarvam AI Multilingual PA.
          </p>
        </div>

        <button
          onClick={onOpenEmergencyBroadcast}
          className="relative z-10 w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white rounded-2xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-500/30 transition-all cursor-pointer active:scale-95 border-none"
        >
          <Radio className="w-5 h-5 animate-pulse" />
          <span>Emergency Broadcast</span>
        </button>
      </div>

      {/* ── Main Intelligent Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* ── Left Column: Chronological Alerts Queue ── */}
        <div className="lg:col-span-5 xl:col-span-3 bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col gap-4 max-h-[800px] overflow-y-auto smooth-scroll">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="font-heading font-black text-xs sm:text-sm text-slate-800 uppercase tracking-widest">
              Active Queue ({activeVenueAlerts.length})
            </span>
            <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${activeVenueAlerts.length > 0 ? 'bg-rose-500 animate-pulse shadow-rose-500/50' : 'bg-[#648d6a]'}`} />
          </div>

          <div className="flex flex-col gap-3">
            {activeVenueAlerts.length === 0 ? (
              <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-[#648d6a]" />
                <span className="font-heading font-black text-sm text-slate-700 tracking-wide">No Active Alerts</span>
                <span className="text-[10px] sm:text-xs font-mono px-4">All sectors within safe thresholds.</span>
              </div>
            ) : (
              activeVenueAlerts.map((alert) => {
                const isSelected = selectedAlert && alert.id === selectedAlert.id;
                let borderClass = 'border-l-4 border-rose-500';
                let badgeBg = 'bg-rose-50 text-rose-600 border-rose-200';
                
                if (alert.riskLevel === 'warning') {
                  borderClass = 'border-l-4 border-orange-500';
                  badgeBg = 'bg-orange-50 text-orange-600 border-orange-200';
                } else if (alert.riskLevel === 'caution') {
                  borderClass = 'border-l-4 border-amber-400';
                  badgeBg = 'bg-amber-50 text-amber-600 border-amber-200';
                } else if (alert.riskLevel === 'safe') {
                  borderClass = 'border-l-4 border-[#648d6a]';
                  badgeBg = 'bg-[#67b2b9]/10 text-[#648d6a] border-[#67b2b9]/30';
                }

                return (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedAlertId(alert.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col gap-2 ${borderClass} ${
                      isSelected
                        ? 'bg-slate-50 border-slate-300 shadow-md text-slate-900 scale-[1.02]'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:shadow-sm text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-[10px] sm:text-[11px] text-slate-500 tracking-widest bg-white px-2 py-0.5 rounded-md border border-slate-200">
                        {alert.id.substring(0, 12)}...
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-slate-100">
                        {alert.timestamp || 'Live'}
                      </span>
                    </div>

                    <span className="font-heading font-black text-sm text-slate-800 line-clamp-2 leading-snug tracking-tight">
                      {alert.title}
                    </span>

                    <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono font-bold truncate">
                      {alert.zoneName}
                    </span>

                    <div className="flex items-center justify-between mt-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded font-mono font-black text-[9px] uppercase tracking-widest border shadow-sm ${badgeBg}`}>
                          {alert.riskLevel || 'ALERT'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono font-bold text-[9px] uppercase tracking-widest shadow-sm">
                          {alert.category || 'Surge'}
                        </span>
                      </div>
                      <span className="text-rose-600 font-mono font-black text-[11px] tracking-wide">
                        {Number(alert.density || 0).toFixed(1)} <span className="text-[9px]">p/m²</span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right Section: Detail View & AI Panel ── */}
        {activeVenueAlerts.length === 0 ? (
          <div className="lg:col-span-7 xl:col-span-9 bg-white border border-slate-200/80 rounded-3xl p-8 sm:p-16 shadow-sm flex flex-col items-center justify-center text-center gap-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#67b2b9]/20 to-[#648d6a]/20 text-[#648d6a] border border-[#67b2b9]/30 flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="flex flex-col gap-2 max-w-lg">
              <h2 className="font-heading font-black text-2xl text-slate-800 tracking-tight">
                System Optimal — Zero Incidents
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">
                All venue sectors are operating within safe density thresholds. Sentinel AI is continuously monitoring live telemetry streams across all active edge nodes.
              </p>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 xl:col-span-9 grid grid-cols-1 xl:grid-cols-9 gap-6 lg:gap-8">
            
            {/* ── Center Detail Column ── */}
            <div className="xl:col-span-5 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-6">
              {selectedAlert && (
                <>
                  <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] sm:text-xs font-mono font-black text-rose-500 uppercase tracking-widest flex items-center gap-2 bg-rose-50 px-3 py-1 rounded-lg border border-rose-100">
                        <AlertTriangle className="w-4 h-4" />
                        {selectedAlert.category}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                        ID: {selectedAlert.id}
                      </span>
                    </div>
                    <h2 className="font-heading font-black text-xl sm:text-2xl text-slate-900 tracking-tight leading-tight mt-1">
                      {selectedAlert.title}
                    </h2>
                    <span className="text-xs sm:text-sm font-mono font-semibold text-slate-500">
                      {selectedAlert.zoneName}
                    </span>
                  </div>

                  {/* Clean Camera Fallback Container */}
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center shadow-inner group">
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500 z-0">
                      <ImageOff className="w-8 h-8 opacity-50" />
                      <span className="font-mono text-xs font-bold tracking-widest">FEED OFFLINE</span>
                    </div>
                    <img
                      src={getStreamUrl(selectedAlert.zoneId)}
                      alt={`Live stream for ${selectedAlert.zoneName}`}
                      className="w-full h-full object-cover relative z-10"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div className="absolute top-3 left-3 z-20 bg-black/70 backdrop-blur-md text-white text-[9px] sm:text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 border border-white/10 shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                      <span className="tracking-widest uppercase">LIVE EDGE FEED</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl flex flex-col items-center text-center shadow-sm">
                      <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono font-black uppercase tracking-widest mb-1">Density</span>
                      <span className="font-heading font-black text-3xl sm:text-4xl text-rose-500 tracking-tighter">
                        {Number(displayDensity).toFixed(2)} <span className="text-sm font-bold text-slate-400">p/m²</span>
                      </span>
                    </div>
                    <div className="bg-slate-50 border border-slate-200/80 p-5 rounded-2xl flex flex-col items-center text-center shadow-sm">
                      <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono font-black uppercase tracking-widest mb-1">Egress Flow</span>
                      <span className="font-heading font-black text-3xl sm:text-4xl text-slate-800 tracking-tighter">
                        {displayFlowRate} <span className="text-sm font-bold text-slate-400">p/min</span>
                      </span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 p-5 rounded-2xl flex flex-col gap-3 shadow-sm">
                    <span className="font-heading font-black text-xs sm:text-sm text-slate-800 uppercase tracking-widest">
                      Density Progression Curve
                    </span>
                    <div className="h-32 sm:h-40 w-full mt-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={historyData}>
                          <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} fontFamily="monospace" />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} fontFamily="monospace" />
                          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold' }} />
                          <Bar dataKey="density" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Right Column: AI Action Panel ── */}
            <div className="xl:col-span-4 bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-between gap-6 relative text-slate-800">
              
              <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#67b2b9]/10 text-[#67b2b9] rounded-xl border border-[#67b2b9]/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className="font-heading font-black text-base sm:text-lg text-slate-800 tracking-tight">
                    Sentinel AI Diagnostic
                  </span>
                </div>
                <span className="self-start bg-slate-800 text-slate-300 font-mono text-[9px] sm:text-[10px] font-bold px-2.5 py-1 rounded-md tracking-widest uppercase">
                  Engine: gemini-2.5-flash
                </span>
              </div>

              {selectedAlert && (
                <div className="flex flex-col gap-5 flex-1">
                  
                  <div className="bg-[#67b2b9]/5 border border-[#67b2b9]/20 p-5 rounded-2xl text-xs sm:text-sm text-slate-700 leading-relaxed shadow-inner">
                    <span className="font-black text-[#648d6a] block mb-2 font-mono text-[10px] sm:text-[11px] uppercase tracking-widest">
                      Automated Assessment:
                    </span>
                    <span className="font-medium">
                      {selectedAlert.sentinelAnalysis || "Gathering real-time risk diagnostic data..."}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    <span className="font-heading font-black text-[11px] sm:text-xs text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-2">
                      Recommended Countermeasures
                    </span>

                    {(selectedAlert.recommendedActions || []).length === 0 ? (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-medium text-slate-500 text-center">
                        No specific countermeasures required at this threshold.
                      </div>
                    ) : (
                      selectedAlert.recommendedActions.map((action, idx) => {
                        const actionKey = action.id || `${selectedAlert.id}-action-${idx}`;
                        const isExecuted = executedActionIds.includes(action.actionText);

                        return (
                          <div
                            key={actionKey}
                            className={`p-4 sm:p-5 rounded-2xl border flex flex-col gap-3 transition-all ${
                              isExecuted
                                ? 'bg-emerald-50 border-emerald-200 text-slate-800 shadow-sm'
                                : 'bg-white border-slate-200 hover:border-[#67b2b9]/50 hover:bg-slate-50 hover:shadow-md text-slate-800'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="font-black text-xs sm:text-sm leading-snug tracking-tight">
                                {action.actionText}
                              </span>
                              <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-700 font-mono font-bold text-[9px] border border-emerald-200 shrink-0 uppercase tracking-wider shadow-sm">
                                [ ✓ JuPedSim ]
                              </span>
                            </div>

                            <span className="text-[10px] sm:text-[11px] text-slate-500 font-mono font-bold tracking-wide bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                              IMPACT: {action.impact}
                            </span>

                            <button
                              onClick={() => setConfirmationModalAction(action)}
                              disabled={isExecuted}
                              className={`w-full py-3 px-4 rounded-xl font-heading font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border-none shadow-sm active:scale-95 uppercase tracking-wider mt-1 ${
                                isExecuted
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-gradient-to-r from-[#67b2b9] to-[#648d6a] hover:opacity-90 text-white shadow-[#67b2b9]/30'
                              }`}
                            >
                              {isExecuted ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Action Dispatched</span>
                                </>
                              ) : (
                                <>
                                  <span>1-Tap Confirm Action</span>
                                  <ArrowRight className="w-4 h-4" />
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 text-slate-800 p-5 rounded-2xl flex flex-col gap-4 mt-auto shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="font-heading font-black text-[11px] sm:text-xs text-slate-800 flex items-center gap-2 uppercase tracking-widest">
                        <Volume2 className="w-4 h-4 text-[#67b2b9]" /> Sarvam PA Setup
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(['en', 'hi', 'od', 'bn', 'ta'] as SupportedLanguage[]).map((l) => (
                          <button key={l} onClick={() => { setActiveLang(l); onChangeLanguage(l); setBroadcastState({ loading: false, error: null, result: null }); }}
                            className={`px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-mono font-black border transition-all shadow-sm ${activeLang === l ? 'bg-[#648d6a] text-white border-[#648d6a]' : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'}`}>
                            {l.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      value={announcementText}
                      onChange={(e) => setAnnouncementText(e.target.value)}
                      rows={2}
                      className="bg-white border border-slate-200 p-3 rounded-xl text-xs sm:text-sm font-medium text-slate-800 resize-none focus:outline-none focus:border-[#67b2b9] focus:ring-2 focus:ring-[#67b2b9]/20 shadow-inner"
                      placeholder="Announcement text (English) — auto-translated on dispatch"
                    />

                    {broadcastState.result && (
                      <div className="bg-[#67b2b9]/10 border border-[#67b2b9]/20 p-3 rounded-xl text-[11px] sm:text-xs font-mono font-medium text-slate-700 shadow-inner">
                        <span className="text-[#648d6a] font-black block mb-1 uppercase tracking-widest text-[10px]">Translated ({broadcastState.result.language}):</span>
                        {broadcastState.result.translated_text}
                      </div>
                    )}
                    {broadcastState.error && (
                      <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-[11px] sm:text-xs font-bold text-rose-600 shadow-inner">
                        {broadcastState.error}
                      </div>
                    )}

                    <button
                      onClick={handleBroadcast}
                      disabled={broadcastState.loading || !announcementText.trim()}
                      className="w-full py-3 px-4 rounded-xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-50 border-none cursor-pointer shadow-lg active:scale-95 transition-all"
                    >
                      {broadcastState.loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /><span>Processing...</span></>
                      ) : (
                        <><Play className="w-4 h-4 fill-current" /><span>Translate & Broadcast</span></>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── 1-Tap Action Confirmation Modal ── */}
      {confirmationModalAction && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 sm:p-8 font-body animate-fadeIn">
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden p-6 sm:p-8 flex flex-col gap-6 text-slate-800">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div className="flex flex-col gap-1">
                <span className="font-heading font-black text-base sm:text-lg text-[#67b2b9] flex items-center gap-2 tracking-tight">
                  <Sparkles className="w-5 h-5" /> Authorize Countermeasure
                </span>
                <span className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                  Sentinel AI Verified Action
                </span>
              </div>
              <button onClick={() => { setConfirmationModalAction(null); setDispatchState({ loading: false, error: null }); }} className="p-2 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors border border-transparent hover:border-rose-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <span className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest">Target Payload:</span>
              <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-2xl font-heading font-black text-sm sm:text-base text-slate-800 leading-snug shadow-inner">
                "{confirmationModalAction.actionText}"
              </div>
              <span className="text-[10px] sm:text-xs text-slate-500 font-mono font-bold bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 mt-1">
                <strong className="text-slate-700">EXPECTED IMPACT:</strong> {confirmationModalAction.impact}
              </span>
            </div>

            {dispatchState.error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start gap-3 text-rose-600 text-xs sm:text-sm font-bold shadow-inner">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>{dispatchState.error}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
              <button
                onClick={() => { setConfirmationModalAction(null); setDispatchState({ loading: false, error: null }); }}
                className="w-full sm:w-1/3 py-3.5 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-colors active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAction}
                disabled={dispatchState.loading}
                className="w-full sm:w-2/3 py-3.5 bg-gradient-to-r from-[#67b2b9] to-[#648d6a] hover:opacity-90 text-white font-heading font-black text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 border-none cursor-pointer active:scale-95 transition-all"
              >
                {dispatchState.loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Executing...</span></>
                ) : dispatchState.error ? (
                  <span>Retry Dispatch</span>
                ) : (
                  <span>Dispatch Action Now</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};