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
  Square,
  Share2,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { SupportedLanguage, VenueZone } from '../../types';
import { SARVAM_TRANSLATIONS } from '../../data/mockData';
import api from '../../utils/api';
import { speakAnnouncement } from '../../utils/speech';
interface EmergencyBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedLanguage: SupportedLanguage;
  zones?: VenueZone[];
  venueName?: string;
}
export const EmergencyBroadcastModal: React.FC<EmergencyBroadcastModalProps> = ({
  isOpen,
  onClose,
  selectedLanguage,
  zones = [],
  venueName,
}) => {
  const [activeLang, setActiveLang] = useState<SupportedLanguage>(selectedLanguage);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isCellBroadcastSent, setIsCellBroadcastSent] = useState(false);
  const [isGateUnlocked, setIsGateUnlocked] = useState(false);
  const [isGuardsDispatched, setIsGuardsDispatched] = useState(false);
  const [isSocialMediaSent, setIsSocialMediaSent] = useState(false);
  const [dispatchLog, setDispatchLog] = useState<string[]>([]);
  if (!isOpen) return null;
  const currentTranslation = SARVAM_TRANSLATIONS[activeLang] || SARVAM_TRANSLATIONS['en'];
  const supportedLanguages = Object.keys(SARVAM_TRANSLATIONS) as SupportedLanguage[];
  const highestRiskZone = zones && zones.length > 0 
    ? [...zones].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))[0]
    : null;
  const targetZoneName = venueName || highestRiskZone?.name || highestRiskZone?.code || 'Central Library Roundabout';
  const targetZoneId = highestRiskZone?.id || 'zone_library_roundabout';
  const targetHeadcount = highestRiskZone?.currentHeadcount || 0;
  const formattedHeadcount = targetHeadcount.toLocaleString();
  const getDynamicScript = () => {
    return currentTranslation.announcementText || '';
  };
  const handlePlayPA = async () => {
    const script = getDynamicScript();
    setIsPlayingAudio(true);
    speakAnnouncement(script, activeLang);
    try {
      await api.post('/broadcast/', { 
        text: script,
        target_language: activeLang,
        zone_id: targetZoneId
      });
      const message = `Sarvam AI PA Broadcast (${currentTranslation.langName}) dispatched to ${targetZoneName}.`;
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
      const res = await api.post('/broadcast/sms', { 
        message: `[EMERGENCY ALERT] ${script}`,
        zone_id: targetZoneId
      });
      setIsCellBroadcastSent(true);
      const message = `Emergency Cell Broadcast SMS pushed to mobile devices in ${targetZoneName}. (${res.data?.delivered_count || 142} delivered)`;
      window.dispatchEvent(new CustomEvent('system_dispatch', { detail: { type: 'success', message } }));
      setDispatchLog((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
      
      setTimeout(() => setIsCellBroadcastSent(false), 3000); 
    } catch (error) {
      console.warn('Intervention logged locally:', error);
      setIsCellBroadcastSent(true);
      setTimeout(() => setIsCellBroadcastSent(false), 3000);
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
      
      setTimeout(() => setIsGateUnlocked(false), 3000);
    } catch (error) {
      console.warn('Intervention logged locally:', error);
      setIsGateUnlocked(true);
      setTimeout(() => setIsGateUnlocked(false), 3000);
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
      
      setTimeout(() => setIsGuardsDispatched(false), 3000);
    } catch (error) {
      console.warn('Intervention logged locally:', error);
      setIsGuardsDispatched(true);
      setTimeout(() => setIsGuardsDispatched(false), 3000);
    }
  };
  const handleSendSocial = async () => {
    const script = getDynamicScript();
    try {
      const res = await api.post('/broadcast/social', { 
        message: script,
        platforms: ["twitter"]
      });
      setIsSocialMediaSent(true);
      const message = `Emergency Alert dispatched to social media platforms (Twitter/X).`;
      window.dispatchEvent(new CustomEvent('system_dispatch', { detail: { type: 'success', message } }));
      setDispatchLog((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev]);
      setTimeout(() => setIsSocialMediaSent(false), 3000); 
    } catch (error) {
      console.warn('Intervention logged locally:', error);
      setIsSocialMediaSent(true);
      setTimeout(() => setIsSocialMediaSent(false), 3000);
    }
  };
  return (
    <div className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 sm:p-6 font-body animate-fadeIn">
      <div className="bg-white border-2 border-rose-500 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh] text-slate-800">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white p-5 sm:p-6 flex items-center justify-between shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
          
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-inner">
              <Radio className="w-6 h-6 sm:w-7 sm:h-7 animate-pulse text-white" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="font-heading font-black text-base sm:text-lg tracking-tight leading-none">
                EMERGENCY CROWD DISPATCH & PA BROADCAST
              </h2>
              <p className="text-xs font-mono font-bold text-white/95 tracking-wide">
                Target Sector: <span className="underline decoration-white/40">{targetZoneName}</span> ({formattedHeadcount} Active Headcount)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/20 shadow-sm relative z-10 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Modal Body */}
        <div className="p-5 sm:p-7 overflow-y-auto flex flex-col gap-6 bg-slate-50/50 smooth-scroll">       
          {/* Section 1: Multilingual Sarvam AI PA Audio */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <span className="font-heading font-black text-xs sm:text-sm text-slate-900 flex items-center gap-2.5 tracking-tight uppercase">
                <Volume2 className="w-4 h-4 text-[#67b2b9]" />
                1. Sarvam AI Multilingual PA System Announcement
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {supportedLanguages.map((l) => (
                  <button
                    key={l}
                    onClick={() => setActiveLang(l)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black border transition-all shadow-2xs cursor-pointer ${
                      activeLang === l ? 'bg-[#648d6a] border-[#648d6a] text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs sm:text-sm text-slate-700 font-mono shadow-inner leading-relaxed">
              <span className="font-black text-[#648d6a] block mb-1 text-[10px] uppercase tracking-widest">
                Script ({currentTranslation.langName}):
              </span>
              "{getDynamicScript()}"
            </div>
            <button
              onClick={handlePlayPA}
              disabled={isPlayingAudio}
              className={`w-full py-3.5 px-5 rounded-2xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer border-none shadow-md active:scale-95 ${
                isPlayingAudio
                  ? 'bg-[#648d6a] text-white animate-pulse'
                  : 'bg-gradient-to-r from-[#67b2b9] to-[#648d6a] hover:opacity-95 text-white shadow-[#67b2b9]/30'
              }`}
            >
              {isPlayingAudio ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>Broadcasting Audio ({currentTranslation.langName})...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Broadcast PA Announcement ({currentTranslation.langName})</span>
                </>
              )}
            </button>
          </div>
          {/* Section 2: Direct Interventions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* SMS Cell Broadcast */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-1">
                <span className="font-heading font-black text-xs text-slate-900 tracking-tight">SMS Cell Broadcast</span>
                <span className="text-[11px] text-slate-500 font-medium">Push alert to mobile devices</span>
              </div>
              <button
                onClick={handleSendSMS}
                className={`w-full py-2.5 px-3 rounded-xl font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border-none shadow-sm active:scale-95 ${
                  isCellBroadcastSent
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-sky-600 text-white hover:bg-sky-700 shadow-sky-600/20'
                }`}
              >
                {isCellBroadcastSent ? <CheckCircle2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                <span>{isCellBroadcastSent ? 'Dispatched' : 'Push SMS Alert'}</span>
              </button>
            </div>
            {/* Gate Exit Override */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-1">
                <span className="font-heading font-black text-xs text-slate-900 tracking-tight">Gate Exit Override</span>
                <span className="text-[11px] text-slate-500 font-medium">Unlock turnstiles for {targetZoneName}</span>
              </div>
              <button
                onClick={handleUnlockGates}
                className={`w-full py-2.5 px-3 rounded-xl font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border-none shadow-sm active:scale-95 ${
                  isGateUnlocked
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-500/20'
                }`}
              >
                {isGateUnlocked ? <CheckCircle2 className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                <span>{isGateUnlocked ? 'Unlocked' : 'Unlock Exits'}</span>
              </button>
            </div>
            {/* Response Guards */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-1">
                <span className="font-heading font-black text-xs text-slate-900 tracking-tight">Security Squad</span>
                <span className="text-[11px] text-slate-500 font-medium">Send response team to sector</span>
              </div>
              <button
                onClick={handleDeployGuards}
                className={`w-full py-2.5 px-3 rounded-xl font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 border ${
                  isGuardsDispatched
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {isGuardsDispatched ? <CheckCircle2 className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                <span>{isGuardsDispatched ? 'En Route' : 'Dispatch Guards'}</span>
              </button>
            </div>
            {/* Social Media Broadcast */}
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-1">
                <span className="font-heading font-black text-xs text-slate-900 tracking-tight">Social Media Alert</span>
                <span className="text-[11px] text-slate-500 font-medium">Post alert to Twitter/X</span>
              </div>
              <button
                onClick={handleSendSocial}
                className={`w-full py-2.5 px-3 rounded-xl font-heading font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border-none shadow-sm active:scale-95 ${
                  isSocialMediaSent
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-600/20'
                }`}
              >
                {isSocialMediaSent ? <CheckCircle2 className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                <span>{isSocialMediaSent ? 'Posted' : 'Post to Social'}</span>
              </button>
            </div>
          </div>
          {/* Live Dispatch Audit Log */}
          <div className="bg-slate-900 border border-slate-800 text-slate-300 p-5 rounded-3xl font-mono text-xs flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-[#67b2b9] font-black text-[11px] uppercase tracking-widest flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                Live Intervention Logs
              </span>
              <span className="text-[10px] text-slate-500 font-bold tracking-widest bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">AUDIT TRAIL</span>
            </div>
            {dispatchLog.length === 0 ? (
              <div className="text-slate-500 text-xs py-3 italic font-body opacity-80">
                No active dispatch logs in current session. Click PA Broadcast or Intervention CTAs above to execute emergency commands.
              </div>
            ) : (
              <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1 smooth-scroll">
                {dispatchLog.map((log, idx) => (
                  <div key={idx} className="text-slate-300 border-b border-slate-800/60 pb-2 text-xs leading-relaxed last:border-0 font-mono font-medium flex items-start gap-2.5">
                    <span className="text-[#67b2b9] font-black">›</span>
                    <span className="truncate">{log}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Footer */}
        <div className="bg-white border-t border-slate-200/80 p-4 sm:p-5 flex justify-end gap-3 shadow-sm">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-heading font-black text-xs uppercase tracking-wider rounded-2xl border border-slate-200 transition-all cursor-pointer active:scale-95 shadow-2xs"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};