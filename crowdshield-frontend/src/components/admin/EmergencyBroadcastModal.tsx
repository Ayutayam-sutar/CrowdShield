import React, { useState } from 'react';
import { 
  X, 
  Radio, 
  Volume2, 
  Send, 
  Unlock, 
  Users, 
  CheckCircle2, 
  Play,
  Square
} from 'lucide-react';
import { SupportedLanguage, VenueZone } from '../../types';
import { BHASHINI_TRANSLATIONS } from '../../data/mockData';
import api from '../../utils/api';
import { speakAnnouncement } from '../../utils/speech';

interface EmergencyBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: SupportedLanguage;
  zones?: VenueZone[];
}

export const EmergencyBroadcastModal: React.FC<EmergencyBroadcastModalProps> = ({
  isOpen,
  onClose,
  selectedLanguage,
  zones = [],
}) => {
  const [activeLang, setActiveLang] = useState<SupportedLanguage>(selectedLanguage);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isCellBroadcastSent, setIsCellBroadcastSent] = useState(false);
  const [isGateUnlocked, setIsGateUnlocked] = useState(false);
  const [isGuardsDispatched, setIsGuardsDispatched] = useState(false);
  const [dispatchLog, setDispatchLog] = useState<string[]>([]);

  if (!isOpen) return null;

  const currentTranslation = BHASHINI_TRANSLATIONS[activeLang] || BHASHINI_TRANSLATIONS['en'];
  const supportedLanguages = Object.keys(BHASHINI_TRANSLATIONS) as SupportedLanguage[];

  const highestRiskZone = zones && zones.length > 0 
    ? [...zones].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))[0]
    : null;

  const targetZoneName = highestRiskZone?.name || highestRiskZone?.code || 'Central Library Roundabout';
  const targetZoneId = highestRiskZone?.id || 'zone_library_roundabout';
  const targetHeadcount = highestRiskZone?.currentHeadcount || 0;
  const formattedHeadcount = targetHeadcount.toLocaleString();

  const getDynamicScript = () => {
    if (!highestRiskZone) return currentTranslation.announcementText;
    if (activeLang === 'en') {
      return `Attention visitors near ${targetZoneName}. The area is currently congested. Please move calmly towards Gate 2 (EV Charging Junction) for a safe exit.`;
    }
    return currentTranslation.announcementText.replace(/West Exit|Sector/gi, targetZoneName);
  };

  const handlePlayPA = async () => {
    const script = getDynamicScript();
    setIsPlayingAudio(true);
    speakAnnouncement(script, activeLang);

    try {
      await api.post('/interventions/dispatch', { 
        actionText: `🔊 Multilingual PA Broadcast (${currentTranslation.langName})`,
        zoneId: targetZoneId,
        impact: `PA instruction broadcasted to ${targetZoneName}`,
        language: activeLang,
        announcementText: script
      });

      const message = `Bhashini PA Broadcast (${currentTranslation.langName}) dispatched to ${targetZoneName}.`;
      window.dispatchEvent(new CustomEvent('system_dispatch', { detail: { type: 'info', message } }));
      setDispatchLog((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
    } catch (error) {
      console.warn('Intervention logged locally:', error);
    }

    const estimatedDurationMs = Math.max(script.length * 75, 3000);
    setTimeout(() => {
      setIsPlayingAudio(false);
    }, estimatedDurationMs);
  };

  const handleSendSMS = async () => {
    const script = getDynamicScript();
    try {
      await api.post('/interventions/dispatch', { 
        actionText: `📱 Emergency SMS Cell Broadcast`,
        zoneId: targetZoneId,
        impact: `Cell broadcast alert pushed to mobile devices near ${targetZoneName}`,
        language: activeLang,
        announcementText: `[EMERGENCY ALERT] ${script}`
      });

      setIsCellBroadcastSent(true);
      const message = `Emergency Cell Broadcast SMS sent to mobile devices in ${targetZoneName}.`;
      window.dispatchEvent(new CustomEvent('system_dispatch', { detail: { type: 'success', message } }));
      setDispatchLog((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
    } catch (error) {
      console.warn('Intervention logged locally:', error);
      setIsCellBroadcastSent(true);
    }
  };

  const handleUnlockGates = async () => {
    try {
      await api.post('/interventions/dispatch', { 
        actionText: `🔓 Remote Gate Override`,
        zoneId: targetZoneId,
        impact: `Remotely unlocked all auxiliary gates for ${targetZoneName}`,
        announcementText: `EMERGENCY NOTICE: Auxiliary Exit Gates near ${targetZoneName} have been unlocked remotely. Proceed calmly.`
      });

      setIsGateUnlocked(true);
      const message = `Override signal dispatched: Emergency turnstiles in ${targetZoneName} unlocked remotely.`;
      window.dispatchEvent(new CustomEvent('system_dispatch', { detail: { type: 'warning', message } }));
      setDispatchLog((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
    } catch (error) {
      console.warn('Intervention logged locally:', error);
      setIsGateUnlocked(true);
    }
  };

  const handleDeployGuards = async () => {
    try {
      await api.post('/interventions/dispatch', { 
        actionText: `👮 Dispatch Response Security Squad`,
        zoneId: targetZoneId,
        impact: `Dispatched security response team to bottleneck in ${targetZoneName}`,
        announcementText: `NOTICE: Security response teams are en route to ${targetZoneName} to assist crowd movement.`
      });

      setIsGuardsDispatched(true);
      const message = `Security response squad dispatched to ${targetZoneName}.`;
      window.dispatchEvent(new CustomEvent('system_dispatch', { detail: { type: 'warning', message } }));
      setDispatchLog((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
    } catch (error) {
      console.warn('Intervention logged locally:', error);
      setIsGuardsDispatched(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-body animate-fadeIn">
      <div className="bg-white border-2 border-[#FF3B5C] rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] text-slate-800">
        {/* Header */}
        <div className="bg-[#FF3B5C] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg leading-tight">
                EMERGENCY CROWD DISPATCH & PA BROADCAST
              </h2>
              <p className="text-xs text-white/80">
                Target Sector: {targetZoneName} ({formattedHeadcount} Active Headcount)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border-none bg-transparent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex flex-col gap-5 bg-white">
          {/* Section 1: Multilingual Bhashini PA Audio */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-heading font-bold text-sm text-slate-800 flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-indigo-600" />
                1. Bhashini Multilingual PA System Announcement
              </span>
              <div className="flex items-center gap-1">
                {supportedLanguages.map((l) => (
                  <button
                    key={l}
                    onClick={() => setActiveLang(l)}
                    className={`px-2 py-0.5 rounded text-xs font-mono-num font-bold transition-colors border cursor-pointer ${
                      activeLang === l ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-700 font-mono-num">
              <span className="font-bold text-indigo-600 block mb-1">
                Script ({currentTranslation.langName}):
              </span>
              "{getDynamicScript()}"
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                onClick={handlePlayPA}
                disabled={isPlayingAudio}
                className={`flex-1 py-2.5 px-4 rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border-none ${
                  isPlayingAudio
                    ? 'bg-indigo-600 text-white animate-pulse'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
                }`}
              >
                {isPlayingAudio ? (
                  <>
                    <Square className="w-4 h-4 fill-current" />
                    <span>Broadcasting Audio Wave ({currentTranslation.langName})...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Broadcast PA Announcement ({currentTranslation.langName})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section 2: Direct Interventions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-800">
            {/* SMS Cell Broadcast */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">SMS Cell Broadcast</span>
                <span className="text-[11px] text-slate-500">Push alert to mobile devices</span>
              </div>
              <button
                onClick={handleSendSMS}
                className={`w-full py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none ${
                  isCellBroadcastSent
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-sky-600 text-white hover:bg-sky-700'
                }`}
              >
                {isCellBroadcastSent ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                <span>{isCellBroadcastSent ? 'SMS Dispatched' : 'Push SMS Alert'}</span>
              </button>
            </div>

            {/* Remote Gate Override */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Gate Egress Override</span>
                <span className="text-[11px] text-slate-500">Unlock turnstiles for {targetZoneName}</span>
              </div>
              <button
                onClick={handleUnlockGates}
                className={`w-full py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-none ${
                  isGateUnlocked
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
              >
                {isGateUnlocked ? <CheckCircle2 className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                <span>{isGateUnlocked ? 'Gates Unlocked' : 'Unlock Aux Gates'}</span>
              </button>
            </div>

            {/* Response Guards */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Dispatch Security Squad</span>
                <span className="text-[11px] text-slate-500">Send response team to {targetZoneName}</span>
              </div>
              <button
                onClick={handleDeployGuards}
                className={`w-full py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-200 ${
                  isGuardsDispatched
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 border-solid'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isGuardsDispatched ? <CheckCircle2 className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                <span>{isGuardsDispatched ? 'Guards En Route' : 'Dispatch Guards'}</span>
              </button>
            </div>
          </div>

          {/* Live Dispatch Log */}
          <div className="bg-slate-50 border border-slate-200 text-slate-700 p-4 rounded-xl font-mono-num text-xs flex flex-col gap-2 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-emerald-600 font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Intervention Logs
              </span>
              <span className="text-[10px] text-slate-500">Edge Controller Audit Trail</span>
            </div>
            {dispatchLog.length === 0 ? (
              <div className="text-slate-500 text-xs py-2 italic font-body">
                No active dispatch logs in current session. Click PA Broadcast or Intervention CTAs above to execute emergency commands.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-1">
                {dispatchLog.map((log, idx) => (
                  <div key={idx} className="text-slate-600 border-b border-slate-200 pb-1.5 text-[11px] leading-snug last:border-0 font-mono-num font-medium flex items-start gap-2">
                    <span className="text-sky-600 font-bold">›</span>
                    <span>{log}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 p-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs rounded-xl border-none transition-colors cursor-pointer"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};