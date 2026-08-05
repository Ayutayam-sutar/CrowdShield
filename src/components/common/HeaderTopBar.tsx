import React, { useState } from 'react';
import { VenueInfo, NetworkMode, SupportedLanguage } from '../../types';
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
  selectedVenue: VenueInfo;
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
    <header className="bg-[#FFFFFF] border-b border-[#E7E5DD] px-3 sm:px-4 py-2.5 sticky top-0 z-30 shadow-[0_2px_12px_rgba(21,23,38,0.04)] font-body">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Mobile Drawer Button, Venue Selector & Search */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-[240px]">
          {/* Mobile Menu Toggle */}
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-lg bg-[#FAFAF7] hover:bg-[#E7E5DD] border border-[#E7E5DD] text-[#151726] transition-colors cursor-pointer"
              title="Toggle Command Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}

          {/* Venue Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsVenueDropdownOpen(!isVenueDropdownOpen)}
              className="flex items-center gap-2 bg-[#FAFAF7] hover:bg-[#E7E5DD]/50 border border-[#E7E5DD] px-3 py-1.5 rounded-lg text-xs font-semibold text-[#151726] transition-colors cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-[#2C7BE5]" />
              <span className="truncate max-w-[180px] sm:max-w-[240px] font-heading">{selectedVenue.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#5B5F73]" />
            </button>

            {isVenueDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-[#E7E5DD] rounded-xl shadow-xl z-50 py-1">
                <div className="px-3 py-1.5 text-[11px] font-bold text-[#5B5F73] uppercase tracking-wider border-b border-[#E7E5DD]">
                  Active Command Venues
                </div>
                {venues.map((venue) => (
                  <button
                    key={venue.id}
                    onClick={() => {
                      onSelectVenue(venue);
                      setIsVenueDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex flex-col gap-0.5 hover:bg-[#FAFAF7] transition-colors ${
                      venue.id === selectedVenue.id ? 'bg-[#2C7BE5]/10 font-bold border-l-4 border-[#2C7BE5]' : ''
                    }`}
                  >
                    <span className="text-[#151726]">{venue.name}</span>
                    <span className="text-[11px] text-[#5B5F73] font-mono-num">{venue.location} · {(venue.currentTotalHeadcount ?? 0).toLocaleString()} active</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Global Search Bar */}
          <div className="relative flex-1 max-w-md hidden md:block">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#5B5F73]" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search zones, CCTV cameras, alerts, staff ID..."
              className="w-full bg-[#FAFAF7] border border-[#E7E5DD] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#151726] placeholder-[#5B5F73] focus:outline-none focus:border-[#2C7BE5] focus:ring-1 focus:ring-[#2C7BE5]"
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
              className="flex items-center gap-1.5 bg-[#FAFAF7] hover:bg-[#E7E5DD] text-[#FF3B5C] border border-[#FF3B5C]/40 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Reset Stampede Scenario</span>
            </button>
          ) : (
            <button
              onClick={onTriggerScenario}
              className="flex items-center gap-1.5 bg-[#FF3B5C] hover:bg-[#e02e4d] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-[0_2px_8px_rgba(255,59,92,0.3)] animate-pulse cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span className="font-heading tracking-wide">⚡ Trigger Stampede Scenario</span>
            </button>
          )}

          {/* Bhashini Voice Mic Assistant Button */}
          <button
            onClick={onOpenVoiceModal}
            className="flex items-center gap-1.5 bg-[#7C6CFF]/10 hover:bg-[#7C6CFF]/20 text-[#7C6CFF] border border-[#7C6CFF]/30 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            title="Open Bhashini Voice Command Assistant"
          >
            <Mic className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bhashini Voice</span>
          </button>

          {/* Language Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="flex items-center gap-1 bg-[#FAFAF7] hover:bg-[#E7E5DD]/50 border border-[#E7E5DD] px-2.5 py-1.5 rounded-lg text-xs font-mono-num font-semibold text-[#151726] transition-colors cursor-pointer"
            >
              <Globe2 className="w-3.5 h-3.5 text-[#5B5F73]" />
              <span>{language.toUpperCase()}</span>
            </button>

            {isLangDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 w-44 bg-white border border-[#E7E5DD] rounded-xl shadow-xl z-50 py-1">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onChangeLanguage(lang.code);
                      setIsLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-[#FAFAF7] ${
                      language === lang.code ? 'bg-[#2C7BE5]/10 font-bold text-[#2C7BE5]' : 'text-[#151726]'
                    }`}
                  >
                    <span>{lang.name}</span>
                    <span className="font-mono text-[10px] text-gray-400">{lang.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Alert Notification Bell */}
          <div className="relative">
            <button className="p-1.5 bg-[#FAFAF7] border border-[#E7E5DD] rounded-lg text-[#5B5F73] hover:text-[#151726] transition-colors">
              <Bell className="w-4 h-4" />
              {activeAlertCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF3B5C] text-white text-[10px] font-bold flex items-center justify-center font-mono-num">
                  {activeAlertCount}
                </span>
              )}
            </button>
          </div>

          {/* Profile Avatar */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#E7E5DD]">
            <div className="w-7 h-7 rounded-full bg-[#2C7BE5] text-white font-bold text-xs flex items-center justify-center font-heading">
              OP
            </div>
            <div className="hidden lg:flex flex-col text-[11px]">
              <span className="font-bold text-[#151726] leading-none">operator_01</span>
              <span className="text-[#5B5F73] text-[10px] leading-tight">Chief Controller</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
