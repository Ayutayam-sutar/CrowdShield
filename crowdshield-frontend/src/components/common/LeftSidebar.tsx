import React from 'react';
import { AdminRoute } from '../../types';
import { 
  LayoutDashboard, 
  Map, 
  Video, 
  Bell, 
  BarChart3, 
  Box, 
  Radio, 
  ShieldCheck,
  ChevronRight,
  X,
  Activity
} from 'lucide-react';

interface LeftSidebarProps {
  currentRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
  onOpenEmergencyBroadcast: () => void;
  activeAlertCount: number;
  isScenarioActive: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  currentRoute,
  onNavigate,
  onOpenEmergencyBroadcast,
  activeAlertCount,
  isScenarioActive,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems: { id: AdminRoute; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'map', label: 'Live Map', icon: <Map className="w-5 h-5" /> },
    { id: 'cameras', label: 'CCTV Cameras', icon: <Video className="w-5 h-5" /> },
    { 
      id: 'alerts', 
      label: 'Alerts & Sentinel AI', 
      icon: <Bell className="w-5 h-5" />,
      badge: activeAlertCount 
    },
    { id: 'analytics', label: 'Analytics & Reports', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'twin', label: '3D Digital Twin', icon: <Box className="w-5 h-5" /> },
  ];

  const handleNavClick = (route: AdminRoute) => {
    onNavigate(route);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* ── Mobile Dark Backdrop Overlay (Glassmorphism) ── */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-300"
        />
      )}

      {/* ── Sidebar / Mobile Drawer Container ── */}
      <aside className={`
        bg-white flex flex-col justify-between shrink-0 font-body select-none
        lg:w-72 lg:flex lg:h-full lg:z-20 overflow-hidden shadow-sm
        ${isMobileOpen 
          ? 'fixed inset-y-0 left-0 w-[280px] sm:w-80 z-50 h-full shadow-2xl animate-in slide-in-from-left duration-300 flex' 
          : 'hidden lg:flex'}
      `}>
        
        {/* Top Branding & Main Nav (Scrollable Area) */}
        <div className="flex flex-col gap-6 flex-1 min-h-0 overflow-y-auto smooth-scroll p-5 sm:p-6">
          
          {/* Brand Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
           <div className="relative w-12 h-12 shrink-0">
  {/* Put your logo image here */}
  <img 
    src="/photos/crowdshieldlogo1.png" 
    alt="Logo" 
    className="w-full h-full object-contain" 
  />
</div>
              <div className="flex flex-col">
                <span className="font-heading font-black text-xl text-slate-900 tracking-tight leading-tight">
                  CrowdShield
                </span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#67b2b9] mt-0.5">
                  Command Deck 
                </span>
              </div>
            </div>

            {/* Mobile Drawer Close Button */}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200 active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Tactical Status Indicator Pill */}
          <div className={`border p-3.5 rounded-2xl flex items-center justify-between shadow-inner transition-colors ${
            isScenarioActive ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-1.5 rounded-lg ${isScenarioActive ? 'bg-rose-200/50 text-rose-600' : 'bg-emerald-200/50 text-emerald-600'}`}>
                <Activity className="w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className={`font-black text-xs uppercase tracking-wide ${isScenarioActive ? 'text-rose-700' : 'text-slate-800'}`}>
                  {isScenarioActive ? 'Crisis Elevated' : 'System Optimal'}
                </span>
                <span className="font-mono font-bold text-[9px] text-slate-400 tracking-widest uppercase mt-0.5">
                  Sentinel AI Core
                </span>
              </div>
            </div>
            <span className={`font-mono font-black text-[10px] px-2.5 py-1 rounded-md tracking-widest ${
              isScenarioActive ? 'bg-rose-600 text-white shadow-sm animate-pulse' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
            }`}>
              {isScenarioActive ? 'CRITICAL' : 'SAFE'}
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            <div className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest px-4 py-2">
              Main Navigation
            </div>
            {navItems.map((item) => {
              const isActive = currentRoute === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-200 cursor-pointer border-none group active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#67b2b9] to-[#648d6a] text-white shadow-md shadow-[#67b2b9]/25'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:text-[#67b2b9]'}`}>
                      {item.icon}
                    </div>
                    <span className="font-heading tracking-wide">{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-lg font-black shadow-sm ${
                      isActive ? 'bg-white text-[#648d6a]' : 'bg-rose-500 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Footer Controls & Emergency Broadcast Button ── */}
        <div className="p-5 sm:p-6 border-t border-slate-100 flex flex-col gap-3 bg-white shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
          <button
            onClick={onOpenEmergencyBroadcast}
            className="w-full bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white p-4 rounded-2xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-between shadow-lg shadow-rose-500/30 transition-all cursor-pointer active:scale-95 border-none group"
          >
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <span>Emergency PA</span>
            </div>
            <ChevronRight className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </button>
        </div>

      </aside>
    </>
  );
};