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
        <div className="bg-white text-slate-800 p-4 rounded-2xl shadow-2xl border border-slate-200 flex flex-col gap-3 w-72 sm:w-80 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Header with Close Button */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-heading font-bold text-xs tracking-wide text-slate-500 uppercase">
                Active Session
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              title="Close Menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Session Details / Operator Credentials */}
          <div className="flex flex-col gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 border border-sky-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
                {currentView === 'admin' ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-800 font-heading truncate">
                  {currentView === 'admin' ? `Operator ID: ${userId?.substring(0, 8) || 'SOA-01'}` : `Visitor ID: ${userId?.substring(0, 8) || 'CITIZEN'}`}
                </span>
                <span className="text-[10px] text-emerald-600 font-mono-num font-semibold">
                  {role === 'ADMIN' ? 'Role: Senior Crowd Controller' : 'Citizen App Companion'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-[10px] font-mono-num text-slate-500">
              <div>
                <span className="text-slate-400 block">Clearance:</span>
                <span className="font-bold text-slate-700">{role}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Node Location:</span>
                <span className="font-bold text-slate-700">ITER Control Room</span>
              </div>
            </div>
          </div>

          {/* View Switcher Actions */}
          {role === 'ADMIN' && (
            <div className="flex flex-col gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono-num font-bold">Switch Operational View</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    onSwitchView('admin');
                    setIsOpen(false);
                  }}
                  className={`py-2 px-2.5 rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    currentView === 'admin'
                      ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Deck</span>
                </button>

                <button
                  onClick={() => {
                    onSwitchView('citizen');
                    setIsOpen(false);
                  }}
                  className={`py-2 px-2.5 rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    currentView === 'citizen'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Citizen View</span>
                </button>
              </div>
            </div>
          )}

          {/* Reset Crisis Simulation Trigger */}
          <div className="pt-1 flex flex-col gap-2">
           
            {/* Secure System Exit */}
            <button
              onClick={() => {
                setIsOpen(false);
                localStorage.removeItem('crowdshield_view_mode');
                logout();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-[#FF3B5C] text-[#FF3B5C] hover:text-white border border-rose-200 text-xs font-heading font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
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
          className="bg-white hover:bg-slate-50 text-slate-800 p-2.5 px-4 rounded-full shadow-2xl border border-slate-200 flex items-center gap-2.5 text-xs font-heading font-bold transition-all cursor-pointer active:scale-95 group"
          title="Open Session Controls"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isScenarioActive ? 'bg-[#FF3B5C]' : 'bg-emerald-400'
            }`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              isScenarioActive ? 'bg-[#FF3B5C]' : 'bg-emerald-500'
            }`} />
          </span>

          <span className="text-slate-700 group-hover:text-slate-900 transition-colors">
            {currentView === 'admin' ? 'Admin Session' : 'Citizen Session'}
          </span>

          <div className="h-3 w-px bg-slate-200" />

          <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:-translate-y-0.5" />
        </button>
      )}
    </div>
  );
};