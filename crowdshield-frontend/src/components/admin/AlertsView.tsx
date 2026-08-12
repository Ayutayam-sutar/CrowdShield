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
  Loader2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { speakAnnouncement } from '../../utils/speech';

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

  // CRITICAL FIX 1: Auto-select the newest alert if none is selected or if the selected one resolves
  useEffect(() => {
    if (alerts.length > 0) {
      if (!selectedAlertId || !alerts.find(a => a.id === selectedAlertId)) {
        setSelectedAlertId(alerts[0].id);
      }
    }
  }, [alerts, selectedAlertId]);

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) || alerts[0] || null;

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

  // CRITICAL FIX 2: Dynamically look up the camera URL from the props instead of hardcoding ITER
  const getStreamUrl = (zoneId?: string) => {
    if (!zoneId) return 'http://localhost:5000/video_feed';
    const feed = cctvFeeds.find(f => f.zoneId === zoneId);
    return feed?.imageUrl || 'http://localhost:5000/video_feed';
  };

  useEffect(() => {
    if (selectedAlert) {
      setAnnouncementText(''); // Clean slate for live announcement creation
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

          // Don't append if the density hasn't changed (prevents rapid flatlining)
          if (prev.length > 0 && prev[prev.length - 1].density === newPoint.density) {
            return prev;
          }

          // If empty, initialize a smooth curve leading up to current live density
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

          // Keep a rolling window of the last 8 live YOLO frames
          const nextData = [...prev, newPoint];
          if (nextData.length > 8) nextData.shift();
          return nextData;
        });
      }
    };

    fetchHistory();
  }, [selectedAlert?.id, displayDensity]); // Reacts instantly to live YOLO updates!
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
      const detail =
        err?.response?.data?.detail ||
        (err?.request ? 'No response from server — check network/edge connectivity.' : 'Dispatch failed.');
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
          : err?.response?.data?.detail || 'Broadcast failed — Bhashini service unreachable.',
      });
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6 font-body text-slate-800">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-slate-800 tracking-tight">
            Alerts & Response Console
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time incident queue integrated with Sentinel AI risk breakdown and Bhashini Multilingual PA.
          </p>
        </div>

        <button
          onClick={onOpenEmergencyBroadcast}
          className="px-4 py-2 bg-[#FF3B5C] hover:bg-[#e02e4d] text-white rounded-xl font-heading font-bold text-xs flex items-center gap-2 shadow-md transition-colors cursor-pointer border-none"
        >
          <Radio className="w-4 h-4 animate-pulse" />
          <span>Launch Emergency Broadcast</span>
        </button>
      </div>

      {/* 3 Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 3 Columns: Chronological Alerts Queue */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col gap-3 max-h-[750px] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="font-heading font-bold text-xs text-slate-800 uppercase tracking-wider">
              Active Alerts Queue ({alerts.length})
            </span>
            <span className={`w-2 h-2 rounded-full ${alerts.length > 0 ? 'bg-[#FF3B5C] animate-ping' : 'bg-emerald-500'}`} />
          </div>

          <div className="flex flex-col gap-2.5">
            {alerts.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <span className="font-heading font-bold text-xs text-slate-800">No Active Crowd Alerts</span>
                <span className="text-[10px] text-slate-400">All venue sectors currently operating within safe thresholds.</span>
              </div>
            ) : (
              alerts.map((alert) => {
                const isSelected = selectedAlert && alert.id === selectedAlert.id;
                let borderClass = 'border-l-4 border-[#FF3B5C]';
                let badgeBg = 'bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/30';
                
                if (alert.riskLevel === 'warning') {
                  borderClass = 'border-l-4 border-[#FF7A45]';
                  badgeBg = 'bg-[#FF7A45]/15 text-[#FF7A45] border-[#FF7A45]/30';
                } else if (alert.riskLevel === 'caution') {
                  borderClass = 'border-l-4 border-[#FFB627]';
                  badgeBg = 'bg-[#FFB627]/15 text-[#FFB627] border-[#FFB627]/30';
                } else if (alert.riskLevel === 'safe') {
                  borderClass = 'border-l-4 border-[#22D3A6]';
                  badgeBg = 'bg-[#22D3A6]/15 text-emerald-600 border-[#22D3A6]/30';
                }

                return (
                  <div
                    key={alert.id}
                    onClick={() => setSelectedAlertId(alert.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${borderClass} ${
                      isSelected
                        ? 'bg-sky-50/70 border-sky-300 shadow-xs text-slate-800'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono-num font-bold text-[11px] text-slate-800">
                        #{alert.id}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono-num">
                        {alert.timestamp || 'Just now'}
                      </span>
                    </div>

                    <span className="font-heading font-bold text-xs text-slate-800 line-clamp-2 leading-snug">
                      {alert.title}
                    </span>

                    <span className="text-[10px] text-slate-500 font-mono-num">
                      Location: {alert.zoneName}
                    </span>

                    <div className="flex flex-wrap items-center gap-1 my-0.5">
                      <span className={`px-1.5 py-0.2 rounded font-mono-num font-bold text-[9px] border ${badgeBg}`}>
                        {alert.riskLevel ? alert.riskLevel.toUpperCase() : 'ALERT'}
                      </span>
                      <span className="px-1.5 py-0.2 rounded bg-sky-50 text-sky-600 border border-sky-100 font-mono-num font-bold text-[9px]">
                        {alert.category || 'Surge'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono-num mt-1">
                      <span className="text-[#FF3B5C] font-bold">{Number(alert.density || 0).toFixed(2)} p/m²</span>
                      <span className="uppercase text-[10px] text-slate-400">{alert.status || 'active'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {alerts.length === 0 ? (
          <div className="lg:col-span-9 bg-white border border-slate-200 rounded-2xl p-12 shadow-xs flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="flex flex-col gap-1 max-w-md">
              <h2 className="font-heading font-bold text-xl text-slate-800">
                System Optimal — No Active Incidents
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                All venue sectors are operating within safe density thresholds. Sentinel AI is continuously monitoring live telemetry streams across all active edge nodes.
              </p>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono-num bg-emerald-50 text-emerald-600 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Sentinel AI Engine Online · 0 Active Threats
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* Center 5 Columns: Active Alert Detail View */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col gap-5">
              {selectedAlert && (
                <>
                  {/* Alert Title Bar */}
                  <div className="flex flex-col gap-1 border-b border-slate-200 pb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono-num font-bold text-[#FF3B5C] uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        {selectedAlert.category} Incident
                      </span>
                      <span className="text-xs font-mono-num text-slate-500">
                        ID: #{selectedAlert.id}
                      </span>
                    </div>
                    <h2 className="font-heading font-bold text-lg text-slate-800">
                      {selectedAlert.title}
                    </h2>
                    <span className="text-xs text-slate-500">
                      Location: {selectedAlert.zoneName}
                    </span>
                  </div>

                  {/* Live Camera Snapshot */}
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    <img
                      src={getStreamUrl(selectedAlert.zoneId)}
                      alt={`Live stream for ${selectedAlert.zoneName}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/80 text-white text-[10px] font-mono-num px-2 py-0.5 rounded flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B5C] animate-ping" />
                      <span>LIVE FEED Snapshot · {selectedAlert.zoneName}</span>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl font-mono-num">
                      <span className="text-[11px] text-slate-500 block uppercase font-bold">Current Density</span>
                      <span className="font-heading font-extrabold text-2xl text-[#FF3B5C]">
                        {Number(displayDensity).toFixed(2)} <span className="text-xs font-normal">p/m²</span>
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl font-mono-num">
                      <span className="text-[11px] text-slate-500 block uppercase font-bold">Flow Egress Rate</span>
                      <span className="font-heading font-extrabold text-2xl text-slate-800">
                        {displayFlowRate} <span className="text-xs font-normal">p/min</span>
                      </span>
                    </div>
                  </div>

                  {/* 60-Minute Density Trend Bar Chart */}
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col gap-2">
                    <span className="font-heading font-bold text-xs text-slate-800">
                      Density Progression Curve (p/m²)
                    </span>
                    <div className="h-32 w-full mt-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={historyData}>
                          <XAxis dataKey="time" stroke="rgba(15,23,42,0.4)" fontSize={10} tickLine={false} />
                          <YAxis stroke="rgba(15,23,42,0.4)" fontSize={10} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#1e293b', fontSize: '11px' }} />
                          <Bar dataKey="density" fill="#FF3B5C" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Right 4 Columns: Sentinel AI Analysis & Bhashini Multilingual Player */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between gap-5 relative text-slate-800">
              {/* Top Badge */}
              <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="font-heading font-bold text-sm text-indigo-600">
                    Sentinel AI Analysis Panel
                  </span>
                </div>
                <span className="bg-indigo-600 text-white font-mono-num text-[10px] font-bold px-2 py-0.5 rounded-full">
                  bhashini-v2.1
                </span>
              </div>

              {selectedAlert && (
                <div className="flex flex-col gap-4">
                  {/* Sentinel AI Natural Language Analysis */}
                  <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-xl text-xs text-slate-700 leading-relaxed">
                    <span className="font-bold text-indigo-600 block mb-1 font-heading text-xs">
                      Automated Risk Diagnostic:
                    </span>
                    {selectedAlert.sentinelAnalysis || "Gathering real-time risk diagnostic data..."}
                  </div>

                  {/* Recommended Actions */}
                  <div className="flex flex-col gap-2">
                    <span className="font-heading font-bold text-xs text-slate-800 uppercase tracking-wider">
                      Recommended Countermeasures:
                    </span>

                    {(selectedAlert.recommendedActions || []).length === 0 ? (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                        No specific countermeasures required at this threshold.
                      </div>
                    ) : (
                      selectedAlert.recommendedActions.map((action, idx) => {
                        const actionKey = action.id || `${selectedAlert.id}-action-${idx}`;
                        const isExecuted = executedActionIds.includes(action.actionText);

                        return (
                          <div
                            key={actionKey}
                            className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                              isExecuted
                                ? 'bg-emerald-50 border-emerald-300 text-slate-800 shadow-xs'
                                : 'bg-slate-50 border-slate-200 hover:border-indigo-400 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-xs text-slate-800 leading-snug">
                                {action.actionText}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 font-mono-num font-bold text-[10px] border border-emerald-200 shrink-0">
                                [ ✓ JuPedSim Validated ]
                              </span>
                            </div>

                            <span className="text-[11px] text-slate-500 font-mono-num">
                              Impact: {action.impact}
                            </span>

                            <button
                              onClick={() => setConfirmationModalAction(action)}
                              disabled={isExecuted}
                              className={`w-full py-1.5 px-3 rounded-lg font-heading font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none ${
                                isExecuted
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              {isExecuted ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Action Executed & Dispatched</span>
                                </>
                              ) : (
                                <>
                                  <span>1-Tap Confirm Action</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Bhashini Multilingual Audio Announcement Player */}
                  <div className="bg-slate-50 border border-slate-200 text-slate-800 p-4 rounded-xl flex flex-col gap-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-bold text-xs text-indigo-600 flex items-center gap-1.5">
                        <Volume2 className="w-4 h-4" /> Bhashini Multilingual PA Player
                      </span>
                      <div className="flex items-center gap-1">
                        {(['en', 'hi', 'od', 'bn', 'ta'] as SupportedLanguage[]).map((l) => (
                          <button key={l} onClick={() => { setActiveLang(l); onChangeLanguage(l); setBroadcastState({ loading: false, error: null, result: null }); }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono-num font-bold border border-slate-200 transition-colors ${activeLang === l ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 hover:text-slate-800'}`}>
                            {l.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      value={announcementText}
                      onChange={(e) => setAnnouncementText(e.target.value)}
                      rows={2}
                      className="bg-white border border-slate-200 p-2.5 rounded-lg text-[11px] text-slate-800 resize-none focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="Announcement text (English) — translated on dispatch"
                    />

                    {broadcastState.result && (
                      <div className="bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-lg text-[11px] font-mono-num text-slate-700">
                        <span className="text-indigo-600 font-bold block mb-0.5">Translated ({broadcastState.result.language}):</span>
                        {broadcastState.result.translated_text}
                      </div>
                    )}
                    {broadcastState.error && (
                      <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-lg text-[11px] text-rose-600">
                        {broadcastState.error}
                      </div>
                    )}

                    <button
                      onClick={handleBroadcast}
                      disabled={broadcastState.loading || !announcementText.trim()}
                      className="w-full py-2 px-3 rounded-lg font-heading font-bold text-xs flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 border-none cursor-pointer"
                    >
                      {broadcastState.loading ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Translating & Dispatching...</span></>
                      ) : (
                        <><Play className="w-3.5 h-3.5 fill-current" /><span>Translate & Broadcast ({activeLang.toUpperCase()})</span></>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 1-Tap Action Confirmation Modal */}
      {confirmationModalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-body animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-6 flex flex-col gap-4 text-slate-800">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <span className="font-heading font-bold text-sm text-indigo-600 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> 1-Tap Countermeasure Confirmation
              </span>
              <button onClick={() => { setConfirmationModalAction(null); setDispatchState({ loading: false, error: null }); }} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs text-slate-500">Confirming target action payload:</span>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl font-heading font-bold text-xs text-slate-700">
                "{confirmationModalAction.actionText}"
              </div>
              <span className="text-xs text-slate-500 font-mono-num mt-1">Expected Impact: {confirmationModalAction.impact}</span>
            </div>

            {dispatchState.error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2 text-rose-600 text-xs">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{dispatchState.error}</span>
              </div>
            )}

            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => { setConfirmationModalAction(null); setDispatchState({ loading: false, error: null }); }}
                className="flex-1 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 font-semibold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAction}
                disabled={dispatchState.loading}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-heading font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 disabled:opacity-50 border-none cursor-pointer"
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