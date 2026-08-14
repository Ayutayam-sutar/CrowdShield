import React, { useState, useEffect, useRef } from 'react';
import { VenueInfo, NetworkMode, SupportedLanguage } from '../../types';
import { parseVoiceCommand } from '../../utils/nlpCommandParser';
import { VoiceAssistantModal } from './VoiceAssistantModal';
import api from '../../utils/api';
import { 
  MapPin, 
  Search, 
  Mic, 
  Globe2, 
  Bell, 
  ChevronDown,
  AlertTriangle,
  Menu,
  LogOut 
} from 'lucide-react';

interface HeaderTopBarProps {
  venues: VenueInfo[];
  selectedVenue: VenueInfo | null;
  onSelectVenue: (venue: VenueInfo) => void;
  networkMode: NetworkMode;
  onToggleNetworkMode: () => void;
  language: SupportedLanguage;
  onChangeLanguage: (lang: SupportedLanguage) => void;
  isScenarioActive: boolean;
  onTriggerScenario: () => void;
  onResetScenario: () => void;
  onOpenVoiceModal: () => void;
  onSearch: (query: string) => void;
  activeAlertCount: number;
  onToggleMobileMenu?: () => void;
  isCloudSyncLost: boolean;
  onNotificationClick: () => void;
}

export const HeaderTopBar: React.FC<HeaderTopBarProps> = ({
  venues,
  selectedVenue,
  onSelectVenue,
  networkMode,
  onToggleNetworkMode,
  language,
  onChangeLanguage,
  isScenarioActive,
  onTriggerScenario,
  onResetScenario,
  onOpenVoiceModal,
  onSearch,
  activeAlertCount,
  onToggleMobileMenu,
  isCloudSyncLost,
  onNotificationClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isVenueDropdownOpen, setIsVenueDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // ─── TEAM'S CORE BACKEND LOGIC (100% UNTOUCHED) ───
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);

      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('Voice Command Heard:', transcript);
        const parsed = parseVoiceCommand(transcript);
        
        if (parsed) {
          try {
            await api.post('/interventions/execute', {
              actionId: parsed.action,
              zoneId: parsed.target
            });
            window.dispatchEvent(new CustomEvent('voice_command_executed', { detail: parsed.message }));
          } catch (err) {
            console.error('Failed to execute voice command intervention', err);
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) recognitionRef.current?.stop();
    else recognitionRef.current?.start();
  };

  const languages: { code: SupportedLanguage; label: string; name: string }[] = [
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'hi', label: 'HI', name: 'Hindi (हिंदी)' },
    { code: 'od', label: 'OD', name: 'Odia (ଓଡ଼ିଆ)' },
    { code: 'bn', label: 'BN', name: 'Bengali (বাংলা)' },
    { code: 'ta', label: 'TA', name: 'Tamil (தமிழ்)' },
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    onSearch(e.target.value);
  };
  // ──────────────────────────────────────────────────

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm w-full font-body px-3 sm:px-6 py-2.5 sm:py-3 flex flex-col gap-2.5 sm:gap-3 transition-all duration-300">
        
        <div className="flex items-center justify-between gap-1.5 sm:gap-4 w-full min-w-0">
          
          {/* ── LEFT: Mobile Menu & Venue Dropdown ── */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
            {onToggleMobileMenu && (
              <button
                onClick={onToggleMobileMenu}
                className="lg:hidden w-9 h-9 sm:w-auto sm:h-auto sm:p-2.5 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer active:scale-95 shadow-sm shrink-0"
              >
                <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}

            <div className="relative min-w-0 shrink-0">
              <button
                onClick={() => setIsVenueDropdownOpen(!isVenueDropdownOpen)}
                className="flex items-center gap-1.5 sm:gap-2.5 bg-white hover:bg-slate-50 border border-slate-200 px-2 sm:px-3.5 py-1.5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-heading font-bold text-slate-800 transition-all shadow-sm cursor-pointer active:scale-95 shrink-0"
              >
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 shrink-0" />
                <span className="truncate max-w-[80px] sm:max-w-[220px]">
                  {selectedVenue ? selectedVenue.name : 'Loading venue...'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
              </button>

              {isVenueDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95">
                  <div className="px-5 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Active Command Venues
                  </div>
                  {venues.length === 0 ? (
                    <div className="px-5 py-8 text-xs text-slate-500 flex flex-col items-center gap-2 text-center bg-slate-50/50 m-2 rounded-xl border border-slate-100">
                      <AlertTriangle className="w-6 h-6 text-amber-500" />
                      <span className="font-bold text-slate-800 text-sm">No venues loaded</span>
                      <span className="text-[11px] leading-relaxed">Check API connectivity or backend seed data.</span>
                    </div>
                  ) : (
                    <div className="p-1.5 flex flex-col gap-1">
                      {venues.map((venue) => (
                        <button
                          key={venue.id}
                          onClick={() => {
                            onSelectVenue(venue);
                            setIsVenueDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 rounded-xl flex flex-col gap-1 transition-all cursor-pointer ${
                            selectedVenue && venue.id === selectedVenue.id 
                              ? 'bg-indigo-50/80 border border-indigo-100' 
                              : 'bg-transparent hover:bg-slate-50 border border-transparent'
                          }`}
                        >
                          <span className={`font-bold text-sm ${selectedVenue && venue.id === selectedVenue.id ? 'text-indigo-700' : 'text-slate-800'}`}>
                            {venue.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono-num font-semibold flex items-center gap-1.5">
                            <span className="truncate">{venue.location}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                            <span className="shrink-0">{(venue.currentTotalHeadcount ?? 0).toLocaleString()} pax</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── MIDDLE: Search Bar (Desktop) ── */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-4 relative group">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search zones, CCTV cameras, alerts, staff ID..."
              className="w-full bg-slate-100 hover:bg-slate-200/60 focus:bg-white border border-transparent focus:border-indigo-300 rounded-2xl pl-11 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
            />
          </div>

          {/* ── RIGHT: Voice, Controls, & Profile ── */}
          <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
            
            {/* Sarvam Voice Mic */}
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className={`flex items-center justify-center gap-2 w-9 h-9 p-0 sm:w-auto sm:px-3.5 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-heading font-bold transition-all cursor-pointer shadow-sm active:scale-95 shrink-0 ${
                isListening 
                  ? 'bg-rose-50 text-rose-600 border border-rose-200 shadow-[0_0_15px_rgba(244,63,94,0.4)]' 
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/25 border border-transparent'
              }`}
              title="Open Sarvam AI Voice Assistant"
            >
              <Mic className={`w-4 h-4 ${isListening ? 'animate-pulse text-rose-500' : ''}`} />
              <span className="hidden sm:inline tracking-wide">{isListening ? 'Listening...' : 'Sarvam Voice'}</span>
            </button>

            {/* Language & Notifications Wrap */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="relative shrink-0">
                <button
                  onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                  className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl transition-colors cursor-pointer shadow-sm active:scale-95 text-slate-600 hover:text-indigo-600"
                  title="Change Language"
                >
                  <Globe2 className="w-4 h-4" />
                </button>

                {isLangDropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200/80 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in zoom-in-95">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          onChangeLanguage(lang.code);
                          setIsLangDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-xs flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                          language === lang.code ? 'font-bold text-indigo-600 bg-indigo-50/50' : 'font-medium text-slate-700'
                        }`}
                      >
                        <span>{lang.name}</span>
                        <span className="font-mono-num text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{lang.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={onNotificationClick}
                className="relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl sm:rounded-2xl text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer shadow-sm active:scale-95 shrink-0"
              >
                <Bell className="w-4 h-4" />
                {activeAlertCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center font-mono-num animate-in zoom-in shadow-sm border-2 border-white">
                    {activeAlertCount}
                  </span>
                )}
              </button>
            </div>

            {/* Operator Profile */}
            <div className="flex items-center gap-2 sm:gap-3 pl-1.5 sm:pl-4 border-l border-slate-200 shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white font-bold text-[10px] sm:text-xs flex items-center justify-center font-heading shadow-md shrink-0">
                OP
              </div>
              <div className="hidden sm:flex flex-col min-w-[100px]">
                <span className="font-heading font-bold text-sm text-slate-900 tracking-tight">operator_01</span>
                <span className="text-[9px] font-mono-num font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Chief Controller</span>
              </div>
              <button 
                onClick={() => window.dispatchEvent(new Event('unauthorized'))}
                className="hidden sm:flex p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                title="Secure Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
            
          </div>
        </div>

          {/* Crisis Demo Trigger */}
          {/* {isScenarioActive ? (
            <button
              onClick={onResetScenario}
              className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-rose-600 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Reset Stampede Scenario</span>
            </button>
          ) : (
            <button
              onClick={onTriggerScenario}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span className="font-heading tracking-wide">⚡ Trigger Stampede Scenario</span>
            </button>
          )} */}


        {/* ── MOBILE ONLY: Search Bar ── */}
        <div className="md:hidden w-full relative mt-0.5 group">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search zones, alerts, staff ID..."
            className="w-full bg-slate-100 hover:bg-slate-200/60 focus:bg-white border border-transparent focus:border-indigo-300 rounded-xl pl-11 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
          />
        </div>
      </header>

      {/* 🚨 FIX APPLIED: Modal is rendered OUTSIDE the sticky header to prevent stacking context clipping bugs! */}
      <VoiceAssistantModal 
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onExecuteCommand={(cmd) => console.log("Executing:", cmd)}
      />
    </>
  );
};