import React, { useState } from 'react';
import { CrowdAlert, SupportedLanguage, CCTVFeed } from '../../types';
import { BHASHINI_TRANSLATIONS } from '../../data/mockData';
import { 
  Sparkles, 
  Volume2, 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  ArrowRight, 
  Clock, 
  ChevronRight,
  Radio,
  X,
  VolumeX
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface AlertsViewProps {
  alerts: CrowdAlert[];
  cctvFeeds: CCTVFeed[];
  selectedLanguage: SupportedLanguage;
  onChangeLanguage: (lang: SupportedLanguage) => void;
  onOpenEmergencyBroadcast: () => void;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  cctvFeeds,
  selectedLanguage,
  onChangeLanguage,
  onOpenEmergencyBroadcast,
}) => {
  const [selectedAlertId, setSelectedAlertId] = useState<string>(alerts[0]?.id || '');
  const [activeLang, setActiveLang] = useState<SupportedLanguage>(selectedLanguage);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [confirmationModalAction, setConfirmationModalAction] = useState<{
    actionText: string;
    impact: string;
    targetGateOrZone: string;
  } | null>(null);
  const [executedActionIds, setExecutedActionIds] = useState<string[]>([]);

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) || alerts[0];
  const matchingCctv = cctvFeeds.find((c) => c.zoneId === selectedAlert?.zoneId) || cctvFeeds[0];

  const currentTranslation = BHASHINI_TRANSLATIONS[activeLang];

  // 60-min trend bar data
  const densityHistoryData = [
    { time: '-50m', density: 1.4 },
    { time: '-40m', density: 1.8 },
    { time: '-30m', density: 2.2 },
    { time: '-20m', density: 3.1 },
    { time: '-10m', density: 3.9 },
    { time: 'Now', density: selectedAlert ? selectedAlert.density : 4.8 },
  ];

  const handleExecuteAction = () => {
    if (confirmationModalAction) {
      setExecutedActionIds((prev) => [...prev, confirmationModalAction.actionText]);
      setConfirmationModalAction(null);
    }
  };

  const handlePlayAudio = () => {
    setIsPlayingAudio(true);
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, 4000);
  };

  return (
    <div className="p-6 flex flex-col gap-6 font-body">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-[#151726] tracking-tight">
            Alerts & Response Console
          </h1>
          <p className="text-xs text-[#5B5F73] mt-1">
            Real-time incident queue integrated with Sentinel AI risk breakdown and Bhashini Multilingual PA.
          </p>
        </div>

        <button
          onClick={onOpenEmergencyBroadcast}
          className="px-4 py-2 bg-[#FF3B5C] hover:bg-[#e02e4d] text-white rounded-xl font-heading font-bold text-xs flex items-center gap-2 shadow-md transition-colors cursor-pointer"
        >
          <Radio className="w-4 h-4 animate-pulse" />
          <span>Launch Emergency Broadcast</span>
        </button>
      </div>

      {/* 3 Column Console Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 3 Columns: Chronological Alerts Queue */}
        <div className="lg:col-span-3 bg-white border border-[#E7E5DD] rounded-2xl p-4 shadow-[0_2px_12px_rgba(21,23,38,0.04)] flex flex-col gap-3 max-h-[750px] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-[#E7E5DD]">
            <span className="font-heading font-bold text-xs text-[#151726] uppercase tracking-wider">
              Active Alerts Queue ({alerts.length})
            </span>
            <span className="w-2 h-2 rounded-full bg-[#FF3B5C] animate-ping" />
          </div>

          <div className="flex flex-col gap-2.5">
            {alerts.map((alert) => {
              const isSelected = alert.id === selectedAlertId;
              let borderClass = 'border-l-4 border-[#FF3B5C]';
              if (alert.riskLevel === 'warning') borderClass = 'border-l-4 border-[#FF7A45]';
              if (alert.riskLevel === 'caution') borderClass = 'border-l-4 border-[#FFB627]';
              if (alert.riskLevel === 'safe') borderClass = 'border-l-4 border-[#22D3A6]';

              return (
                <div
                  key={alert.id}
                  onClick={() => setSelectedAlertId(alert.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${borderClass} ${
                    isSelected
                      ? 'bg-[#2C7BE5]/10 border-y-[#2C7BE5]/40 border-r-[#2C7BE5]/40 shadow-sm'
                      : 'bg-[#FAFAF7] border-[#E7E5DD] hover:bg-[#FAFAF7]/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-num font-bold text-[11px] text-[#151726]">
                      #{alert.id}
                    </span>
                    <span className="text-[10px] text-[#5B5F73] font-mono-num">
                      {alert.timestamp}
                    </span>
                  </div>

                  <span className="font-heading font-bold text-xs text-[#151726] line-clamp-2 leading-snug">
                    {alert.title}
                  </span>

                  <div className="flex flex-wrap items-center gap-1 my-0.5">
                    <span className="px-1.5 py-0.2 rounded bg-[#FF3B5C]/15 text-[#FF3B5C] font-mono-num font-bold text-[9px] border border-[#FF3B5C]/30">
                      ⚠️ Reverse Flow Detected
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-[#2C7BE5]/15 text-[#2C7BE5] font-mono-num font-bold text-[9px]">
                      Confidence: 98.2%
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono-num mt-1">
                    <span className="text-[#FF3B5C] font-bold">{alert.density} p/m²</span>
                    <span className="uppercase text-[10px] text-[#5B5F73]">{alert.category}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Center 5 Columns: Active Alert Detail View */}
        <div className="lg:col-span-5 bg-white border border-[#E7E5DD] rounded-2xl p-5 shadow-[0_2px_12px_rgba(21,23,38,0.04)] flex flex-col gap-5">
          {selectedAlert && (
            <>
              {/* Alert Title Bar */}
              <div className="flex flex-col gap-1 border-b border-[#E7E5DD] pb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-num font-bold text-[#FF3B5C] uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    {selectedAlert.category} Incident
                  </span>
                  <span className="text-xs font-mono-num text-[#5B5F73]">
                    ID: #{selectedAlert.id}
                  </span>
                </div>
                <h2 className="font-heading font-bold text-lg text-[#151726]">
                  {selectedAlert.title}
                </h2>
                <span className="text-xs text-[#5B5F73]">
                  Location: {selectedAlert.zoneName}
                </span>
              </div>

              {/* Live Camera Snapshot */}
              <div className="relative aspect-video rounded-xl overflow-hidden border border-[#E7E5DD] bg-black">
                <img
                  src={matchingCctv.imageUrl}
                  alt={matchingCctv.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-black/80 text-white text-[10px] font-mono-num px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B5C] animate-ping" />
                  <span>LIVE FEED Snapshot · {matchingCctv.name}</span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#FAFAF7] border border-[#E7E5DD] p-3 rounded-xl font-mono-num">
                  <span className="text-[11px] text-[#5B5F73] block uppercase font-bold">Current Density</span>
                  <span className="font-heading font-extrabold text-2xl text-[#FF3B5C]">
                    {selectedAlert.density} <span className="text-xs font-normal">p/m²</span>
                  </span>
                </div>

                <div className="bg-[#FAFAF7] border border-[#E7E5DD] p-3 rounded-xl font-mono-num">
                  <span className="text-[11px] text-[#5B5F73] block uppercase font-bold">Flow Egress Rate</span>
                  <span className="font-heading font-extrabold text-2xl text-[#151726]">
                    {selectedAlert.flowRate} <span className="text-xs font-normal">p/min</span>
                  </span>
                </div>
              </div>

              {/* 60-Minute Density Trend Bar Chart */}
              <div className="bg-[#FAFAF7] border border-[#E7E5DD] p-4 rounded-xl flex flex-col gap-2">
                <span className="font-heading font-bold text-xs text-[#151726]">
                  60-Minute Density Trend Progression (p/m²)
                </span>
                <div className="h-32 w-full mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={densityHistoryData}>
                      <XAxis dataKey="time" stroke="#5B5F73" fontSize={10} tickLine={false} />
                      <YAxis stroke="#5B5F73" fontSize={10} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: '#151726', borderRadius: '8px', color: '#fff', fontSize: '11px' }} />
                      <Bar dataKey="density" fill="#FF3B5C" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right 4 Columns: Sentinel AI Analysis & Bhashini Multilingual Player */}
        <div className="lg:col-span-4 bg-white border-2 border-[#7C6CFF] rounded-2xl p-5 shadow-[0_4px_20px_rgba(124,108,255,0.12)] flex flex-col justify-between gap-5 relative">
          {/* Top Badge */}
          <div className="flex items-center justify-between border-b border-[#7C6CFF]/20 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#7C6CFF]/15 text-[#7C6CFF] rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-heading font-bold text-sm text-[#7C6CFF]">
                Sentinel AI Analysis Panel
              </span>
            </div>
            <span className="bg-[#7C6CFF] text-white font-mono-num text-[10px] font-bold px-2 py-0.5 rounded-full">
              bhashini-v2.1
            </span>
          </div>

          {selectedAlert && (
            <div className="flex flex-col gap-4">
              {/* Sentinel AI Natural Language Analysis */}
              <div className="bg-[#7C6CFF]/5 border border-[#7C6CFF]/20 p-3.5 rounded-xl text-xs text-[#151726] leading-relaxed">
                <span className="font-bold text-[#7C6CFF] block mb-1 font-heading text-xs">
                  Automated Risk Diagnostic:
                </span>
                {selectedAlert.sentinelAnalysis}
              </div>

              {/* Hardware Intervention Overrides */}
              <div className="flex flex-col gap-2 p-3 bg-[#151726] rounded-xl border border-white/10 text-white">
                <span className="font-heading font-bold text-xs uppercase text-[#22D3A6] flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" /> Hardware-Level Master Overrides
                </span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    onClick={() => {
                      setConfirmationModalAction({
                        actionText: "🔓 Force-Unlock All Turnstiles (Gate 3 & Gate 4)",
                        impact: "Immediate physical pressure relief across all exit turnstiles",
                        targetGateOrZone: "West Exit & Aux Corridor"
                      });
                    }}
                    className="p-2.5 bg-[#FF3B5C]/20 hover:bg-[#FF3B5C] border border-[#FF3B5C]/40 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer text-left flex items-center gap-1.5"
                  >
                    <span>🔓 Force-Unlock All Turnstiles</span>
                  </button>

                  <button
                    onClick={() => {
                      setConfirmationModalAction({
                        actionText: "📱 Dispatch SMS Cell Broadcast to Sector 7G",
                        impact: "Reaches all citizen devices within 500m radius via emergency broadcast",
                        targetGateOrZone: "Sector 7G Cell Tower"
                      });
                    }}
                    className="p-2.5 bg-[#7C6CFF]/20 hover:bg-[#7C6CFF] border border-[#7C6CFF]/40 text-white text-[11px] font-bold rounded-lg transition-all cursor-pointer text-left flex items-center gap-1.5"
                  >
                    <span>📱 Dispatch SMS Cell Broadcast</span>
                  </button>
                </div>
              </div>

              {/* Recommended Actions */}
              <div className="flex flex-col gap-2">
                <span className="font-heading font-bold text-xs text-[#151726] uppercase tracking-wider">
                  Recommended Countermeasures:
                </span>

                {selectedAlert.recommendedActions.map((action) => {
                  const isExecuted = executedActionIds.includes(action.actionText);

                  return (
                    <div
                      key={action.id}
                      className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${
                        isExecuted
                          ? 'bg-[#22D3A6]/10 border-[#22D3A6]/40'
                          : 'bg-[#FAFAF7] border-[#E7E5DD] hover:border-[#7C6CFF]/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-xs text-[#151726] leading-snug">
                          {action.actionText}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#22D3A6]/15 text-[#059669] font-mono-num font-bold text-[10px] border border-[#22D3A6]/30 shrink-0">
                          [ ✓ JuPedSim Validated: 94% Success ]
                        </span>
                      </div>

                      <span className="text-[11px] text-[#5B5F73] font-mono-num">
                        Impact: {action.impact}
                      </span>

                      <button
                        onClick={() => setConfirmationModalAction(action)}
                        disabled={isExecuted}
                        className={`w-full py-1.5 px-3 rounded-lg font-heading font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          isExecuted
                            ? 'bg-[#22D3A6] text-white'
                            : 'bg-[#7C6CFF] text-white hover:bg-[#6856ff]'
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
                })}
              </div>

              {/* Bhashini Multilingual Audio Announcement Player */}
              <div className="bg-[#151726] text-white p-4 rounded-xl flex flex-col gap-3 shadow-md">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-xs text-[#7C6CFF] flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4" />
                    Bhashini Multilingual PA Player
                  </span>
                  {/* Language Selector */}
                  <div className="flex items-center gap-1">
                    {(['en', 'hi', 'od', 'bn', 'ta'] as SupportedLanguage[]).map((l) => (
                      <button
                        key={l}
                        onClick={() => {
                          setActiveLang(l);
                          onChangeLanguage(l);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono-num font-bold transition-colors ${
                          activeLang === l ? 'bg-[#7C6CFF] text-white' : 'bg-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        {l.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Announcement text preview */}
                <div className="bg-black/40 border border-white/10 p-2.5 rounded-lg text-[11px] font-mono-num text-gray-300">
                  <span className="text-[#7C6CFF] font-bold block mb-0.5">
                    {currentTranslation.langName} Audio Script:
                  </span>
                  "{currentTranslation.announcementText}"
                </div>

                <button
                  onClick={handlePlayAudio}
                  disabled={isPlayingAudio}
                  className={`w-full py-2 px-3 rounded-lg font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    isPlayingAudio
                      ? 'bg-[#7C6CFF] text-white animate-pulse'
                      : 'bg-[#7C6CFF] hover:bg-[#6856ff] text-white'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {isPlayingAudio
                      ? `Playing Audio Wave (${currentTranslation.langName})...`
                      : `Play Bhashini Announcement (${currentTranslation.langName})`}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 1-Tap Action Confirmation Modal */}
      {confirmationModalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-body animate-fadeIn">
          <div className="bg-white border-2 border-[#7C6CFF] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-6 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-[#E7E5DD] pb-3">
              <span className="font-heading font-bold text-sm text-[#7C6CFF] flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> 1-Tap Countermeasure Confirmation
              </span>
              <button
                onClick={() => setConfirmationModalAction(null)}
                className="p-1 rounded-lg hover:bg-[#FAFAF7] text-[#5B5F73]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs text-[#5B5F73]">Confirming target action payload:</span>
              <div className="bg-[#FAFAF7] border border-[#E7E5DD] p-3 rounded-xl font-heading font-bold text-xs text-[#151726]">
                "{confirmationModalAction.actionText}"
              </div>
              <span className="text-xs text-[#5B5F73] font-mono-num mt-1">
                Expected Impact: {confirmationModalAction.impact}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => setConfirmationModalAction(null)}
                className="flex-1 py-2 bg-[#FAFAF7] border border-[#E7E5DD] text-[#5B5F73] font-semibold text-xs rounded-xl hover:bg-[#E7E5DD] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAction}
                className="flex-1 py-2 bg-[#7C6CFF] hover:bg-[#6856ff] text-white font-heading font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Dispatch Action Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
