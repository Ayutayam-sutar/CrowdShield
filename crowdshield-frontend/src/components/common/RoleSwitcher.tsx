import React, { useState } from 'react';
import { ViewMode } from '../../types';
import { ShieldAlert, RefreshCw, Lock, ChevronUp, X, Shield, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface RoleSwitcherProps {
  currentView: ViewMode;
  onSwitchView: (view: ViewMode) => void;
  isScenarioActive: boolean;
  onResetScenario: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  currentView,
  onSwitchView,
  isScenarioActive,
  onResetScenario,
  className = '',
  style,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { logout, role, userId } = useAuth();

  return (
    <div 
      style={style}
      className={`fixed ${(style && style.bottom) ? '' : (currentView === 'citizen' ? 'bottom-16 sm:bottom-6' : 'bottom-4 sm:bottom-6')} right-4 sm:right-6 z-50 flex flex-col items-end gap-2 font-body transition-all ${className}`}
    >
      {/* Expanded Popover Panel */}
      {isOpen && (
        <div className="bg-[#151726] text-white p-4 rounded-2xl shadow-2xl border border-white/10 flex flex-col gap-3 w-72 sm:w-80 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Header with Close Button */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22D3A6] animate-pulse" />
              <span className="font-heading font-bold text-xs tracking-wide text-white/90 uppercase">
                Active Session
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
              title="Close Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Session Details / Mock Operator Credentials */}
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-white/10 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#2C7BE5]/20 text-[#2C7BE5] border border-[#2C7BE5]/30 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {currentView === 'admin' ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-white font-heading truncate">
                  {currentView === 'admin' ? `Operator ID: ${userId?.substring(0, 8)}` : `Visitor ID: ${userId?.substring(0, 8)}`}
                </span>
                <span className="text-[10px] text-[#22D3A6] font-mono-num">
                  {role === 'ADMIN' ? 'Role: Senior Crowd Controller' : 'Citizen App Companion'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-2 text-[10px] font-mono-num text-white/70">
              <div>
                <span className="text-white/40 block">Clearance:</span>
                <span className="font-bold text-white">{role}</span>
              </div>
              <div>
                <span className="text-white/40 block">Node Location:</span>
                <span className="font-bold text-white">Control Room 7G</span>
              </div>
            </div>
          </div>

          {/* Reset Crisis Simulation Trigger */}
          <div className="pt-1 flex flex-col gap-2">
            <button
              onClick={() => {
                onResetScenario();
              }}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-heading font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isScenarioActive
                  ? 'bg-[#FF3B5C] hover:bg-[#e0304f] text-white shadow-md'
                  : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isScenarioActive ? 'animate-spin' : ''}`} />
              <span>{isScenarioActive ? 'Reset Active Crisis Test' : 'Trigger Crisis Simulation'}</span>
            </button>

            {/* Secure System Exit */}
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-[#FF3B5C]/15 hover:bg-[#FF3B5C] text-[#FF3B5C] hover:text-white border border-[#FF3B5C]/30 text-xs font-heading font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Secure System Exit</span>
            </button>
          </div>
        </div>
      )}

      {/* Single Collapsed Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-[#151726] hover:bg-[#202338] text-white p-2.5 px-4 rounded-full shadow-2xl border border-white/15 flex items-center gap-2.5 text-xs font-heading font-bold transition-all cursor-pointer active:scale-95 group"
          title="Open Session Controls"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isScenarioActive ? 'bg-[#FF3B5C]' : 'bg-[#22D3A6]'
            }`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              isScenarioActive ? 'bg-[#FF3B5C]' : 'bg-[#22D3A6]'
            }`} />
          </span>

          <span className="text-white/90 group-hover:text-white transition-colors">
            {currentView === 'admin' ? 'Admin Session' : 'Citizen Session'}
          </span>

          <div className="h-3 w-px bg-white/20" />

          <ChevronUp className="w-4 h-4 text-white/70 group-hover:text-white transition-transform group-hover:-translate-y-0.5" />
        </button>
      )}
    </div>
  );
};

