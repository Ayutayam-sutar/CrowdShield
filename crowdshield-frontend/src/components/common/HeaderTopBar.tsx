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
    <header className="bg-[#0B0F19] border-b border-white/10 px-3 sm:px-4 py-2.5 sticky top-0 z-30 shadow-lg font-body">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Mobile Drawer Button, Venue Selector & Search */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-[240px]">
          {/* Mobile Menu Toggle */}
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors cursor-pointer"
              title="Toggle Command Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {/* Venue Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsVenueDropdownOpen(!isVenueDropdownOpen)}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-[#06b6d4]" />
              <span className="truncate max-w-[180px] sm:max-w-[240px] font-heading">
                {selectedVenue ? selectedVenue.name : (venues.length === 0 ? 'Select Venue' : 'Awaiting Edge Telemetry...')}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-white/50" />
            </button>

            {isVenueDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-[#111827] border border-white/10 rounded-xl shadow-2xl z-50 py-1">
                <div className="px-3 py-1.5 text-[11px] font-bold text-white/50 uppercase tracking-wider border-b border-white/10">
                  Active Command Venues
                </div>
                {venues.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-white/50 text-center italic">
                    Awaiting Edge Telemetry...
                  </div>
                ) : (
                  venues.map((venue) => (
                    <button
                      key={venue.id}
                      onClick={() => {
                        onSelectVenue(venue);
                        setIsVenueDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex flex-col gap-0.5 hover:bg-white/5 transition-colors ${
                        selectedVenue && venue.id === selectedVenue.id ? 'bg-[#06b6d4]/10 font-bold border-l-4 border-[#06b6d4]' : ''
                      }`}
                    >
                      <span className="text-white">{venue.name}</span>
                      <span className="text-[11px] text-white/50 font-mono-num">
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
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search zones, CCTV cameras, alerts, staff ID..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/50 focus:outline-none focus:border-[#06b6d4] focus:ring-1 focus:ring-[#06b6d4]"
            />
          </div>
        </div>

        {/* Right Controls: Mode Toggle, Crisis Trigger, Voice, Language, Avatar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Network Resilience Toggle */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onToggleNetworkMode}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                networkMode === 'edge'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-800'
                  : 'bg-[#2C7BE5]/10 border-[#2C7BE5]/30 text-[#2C7BE5]'
              }`}
              title="Toggle Cloud vs Edge Local Mode"
            >
              {networkMode === 'cloud' ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-[#2C7BE5]" />
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
              <span className="hidden lg:inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-mono-num px-2.5 py-1 rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Running on Local Edge Laptop (SQLite + Redis Active)
              </span>
            )}
          </div>

          {/* Crisis Demo Trigger */}
          {isScenarioActive ? (
            <button
              onClick={onResetScenario}
              className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-[#f43f5e] border border-[#f43f5e]/40 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Reset Stampede Scenario</span>
            </button>
          ) : (
            <button
              onClick={onTriggerScenario}
              className="flex items-center gap-1.5 bg-[#f43f5e] hover:bg-[#e02e4d] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-[0_2px_8px_rgba(244,63,94,0.3)] animate-pulse cursor-pointer"
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
                ? 'bg-[#FF3B5C]/20 text-[#FF3B5C] border-[#FF3B5C] animate-pulse shadow-[0_0_10px_rgba(255,59,92,0.5)]' 
                : 'bg-[#7C6CFF]/10 hover:bg-[#7C6CFF]/20 text-[#7C6CFF] border-[#7C6CFF]/30'
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
              className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1.5 rounded-lg text-xs font-mono-num font-semibold text-white transition-colors cursor-pointer"
            >
              <Globe2 className="w-3.5 h-3.5 text-white/50" />
              <span>{language.toUpperCase()}</span>
            </button>

            {isLangDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 w-44 bg-[#111827] border border-white/10 rounded-xl shadow-xl z-50 py-1">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onChangeLanguage(lang.code);
                      setIsLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-white/5 ${
                      language === lang.code ? 'bg-[#06b6d4]/10 font-bold text-[#06b6d4]' : 'text-white'
                    }`}
                  >
                    <span>{lang.name}</span>
                    <span className="font-mono text-[10px] text-white/50">{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Alert Notification Bell */}
          <div className="relative">
            <button className="p-1.5 bg-white/5 border border-white/10 rounded-lg text-white/50 hover:text-white transition-colors">
              <Bell className="w-4 h-4" />
              {activeAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#f43f5e] text-white text-[10px] font-bold flex items-center justify-center font-mono-num">
                  {activeAlertCount}
                </span>
              )}
            </button>
          </div>

          {/* Profile Avatar & Logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-white/10">
            <div className="w-7 h-7 rounded-full bg-[#06b6d4] text-[#0B0F19] font-bold text-xs flex items-center justify-center font-heading">
              OP
            </div>
            <div className="hidden lg:flex flex-col text-[11px] mr-2">
              <span className="font-bold text-white leading-none">operator_01</span>
              <span className="text-white/50 text-[10px] leading-tight">Chief Controller</span>
            </div>
            <button 
              onClick={() => window.dispatchEvent(new Event('unauthorized'))}
              className="p-1.5 rounded bg-red-500/10 text-[#f43f5e] hover:bg-red-500/20 transition-colors"
              title="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" x2="9" y1="12" y2="12"></line></svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
