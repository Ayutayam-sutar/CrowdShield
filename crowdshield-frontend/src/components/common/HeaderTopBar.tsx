import React, { useState, useEffect, useRef } from 'react';
import { VenueInfo, NetworkMode, SupportedLanguage } from '../../types';
import { parseVoiceCommand } from '../../utils/nlpCommandParser';
import api from '../../utils/api';
import { 
  MapPin, 
  Search, 
  Mic, 
  Globe2, 
  Cloud, 
  HardDrive, 
  Zap, 
  User, 
  Bell, 
  ChevronDown,
  AlertTriangle,
  RefreshCw,
  Menu
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
  isCloudSyncLost: boolean; // real connection state, from App.tsx's network_status event
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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isVenueDropdownOpen, setIsVenueDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = async (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('Voice Command Heard:', transcript);
        const parsed = parseVoiceCommand(transcript);
        
        if (parsed) {
          // Execute the action automatically
          try {
            await api.post('/interventions/execute', {
              actionId: parsed.action,
              zoneId: parsed.target
            });
            // Dispatch custom event for Toast in App.tsx
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

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
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

  return (
    <header className="bg-white border-b border-slate-200 px-3 sm:px-4 py-2 sticky top-0 z-30 shadow-sm font-body flex flex-col gap-2">
      {/* Row 1: Main Control Row */}
      <div className="flex items-center justify-between gap-3 w-full">
        {/* Left: Mobile Drawer Button, Venue Selector & Search */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1">
          {/* Mobile Menu Toggle */}
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Toggle Command Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {/* Venue Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsVenueDropdownOpen(!isVenueDropdownOpen)}
              className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-sky-600" />
              <span className="truncate max-w-[180px] sm:max-w-[240px] font-heading">
                {selectedVenue ? selectedVenue.name : 'Loading venue...'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isVenueDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-1">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                  Active Command Venues
                </div>
                {venues.length === 0 ? (
                  <div className="px-3 py-4 text-xs text-slate-400 flex flex-col items-center gap-1.5 text-center">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>No venues loaded from backend yet.</span>
                    <span className="text-[10px]">Check API connectivity or backend seed data.</span>
                  </div>
                ) : (
                  venues.map((venue) => (
                    <button
                      key={venue.id}
                      onClick={() => {
                        onSelectVenue(venue);
                        setIsVenueDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex flex-col gap-0.5 hover:bg-slate-50 transition-colors ${
                        selectedVenue && venue.id === selectedVenue.id ? 'bg-sky-50 font-bold border-l-4 border-sky-500' : ''
                      }`}
                    >
                      <span className="text-slate-800">{venue.name}</span>
                      <span className="text-[11px] text-slate-500 font-mono-num">
                        {venue.location} · {(venue.currentTotalHeadcount ?? 0).toLocaleString()} active
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Global Search Bar */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search zones, CCTV cameras, alerts, staff ID..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Right Controls: Mode Toggle, Crisis Trigger, Voice, Language */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Network Resilience Toggle */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleNetworkMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                networkMode === 'edge'
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-sky-50 border-sky-200 text-sky-700'
              }`}
              title="Toggle Cloud vs Edge Local Mode"
            >
              {networkMode === 'cloud' ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-sky-600" />
                  <span className="hidden xl:inline">Mode:</span>
                  <span className="font-bold">Cloud Sync</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  <span className="hidden xl:inline">Mode:</span>
                  <span className="font-bold text-amber-700">Edge Isolated</span>
                </>
              )}
            </button>

            {networkMode === 'edge' && (
              <span className="hidden md:inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-mono-num px-2.5 py-1 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                <span className="hidden xl:inline">Running on Local Edge Laptop (SQLite + Redis Active)</span>
                <span className="inline xl:hidden">Local Edge Active</span>
              </span>
            )}
          </div>

          {/* Crisis Demo Trigger */}
          {isScenarioActive ? (
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
          )}

          {/* Bhashini Voice Mic Assistant Button */}
          <button
            onClick={toggleListening}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
              isListening 
                ? 'bg-rose-50 text-rose-600 border-rose-300 shadow-sm' 
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-200'
            }`}
            title="Open Bhashini Voice Command Assistant"
          >
            <Mic className={`w-3.5 h-3.5 ${isListening ? 'animate-bounce' : ''}`} />
            <span className="hidden sm:inline">{isListening ? 'Listening...' : 'Bhashini Voice'}</span>
          </button>

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="flex items-center gap-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-mono-num font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              <Globe2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{language.toUpperCase()}</span>
            </button>

            {isLangDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onChangeLanguage(lang.code);
                      setIsLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 ${
                      language === lang.code ? 'bg-sky-50 font-bold text-sky-600' : 'text-slate-700'
                    }`}
                  >
                    <span>{lang.name}</span>
                    <span className="font-mono text-[10px] text-slate-400">{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Alert Notification Bell */}
          <div className="relative">
            <button className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
              <Bell className="w-4 h-4" />
              {activeAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center font-mono-num">
                  {activeAlertCount}
                </span>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Row 2: Operator Session Info & Logout */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1 border-t border-slate-100 pt-1.5 mt-0.5 w-full">
        {/* Left Side: Session status */}
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isCloudSyncLost ? 'bg-amber-500' : 'bg-emerald-600'}`} />
          <span>
            Active Command Session ·{' '}
            {isCloudSyncLost
              ? 'Cloud Sync Lost — Local Edge Cache Only'
              : networkMode === 'cloud'
              ? 'Connected to Cloud DB'
              : 'Local Edge Session (SQLite)'}
          </span>
        </div>
        
        {/* Right Side: Operator profile & logout button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-sky-500 text-white font-bold text-[10px] flex items-center justify-center font-heading">
              OP
            </div>
            <span className="font-bold text-slate-700">operator_01</span>
            <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">Chief Controller</span>
          </div>
          <button 
            onClick={() => window.dispatchEvent(new Event('unauthorized'))}
            className="p-1 rounded hover:bg-red-50 text-rose-600 transition-colors cursor-pointer bg-transparent border-none flex items-center justify-center"
            title="Logout"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" x2="9" y1="12" y2="12"></line></svg>
          </button>
        </div>
      </div>
    </header>
  );
};