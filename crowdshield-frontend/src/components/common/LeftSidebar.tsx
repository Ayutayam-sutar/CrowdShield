import React from 'react';
import { AdminRoute } from '../../types';
import { 
  LayoutDashboard, 
  Map, 
  Video, 
  Bell, 
  BarChart3, 
  Box, 
  Settings, 
  Radio, 
  HelpCircle, 
  FileText,
  ShieldCheck,
  ChevronRight,
  X
} from 'lucide-react';

interface LeftSidebarProps {
  currentRoute: AdminRoute;
  onNavigate: (route: AdminRoute) => void;
  onOpenEmergencyBroadcast: () => void;
  onOpenSupportModal: () => void;
  onOpenLogsModal: () => void;
  activeAlertCount: number;
  isScenarioActive: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  currentRoute,
  onNavigate,
  onOpenEmergencyBroadcast,
  onOpenSupportModal,
  onOpenLogsModal,
  activeAlertCount,
  isScenarioActive,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems: { id: AdminRoute; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'map', label: 'Live Map', icon: <Map className="w-4 h-4" /> },
    { id: 'cameras', label: 'CCTV Cameras', icon: <Video className="w-4 h-4" /> },
    { 
      id: 'alerts', 
      label: 'Alerts & Sentinel AI', 
      icon: <Bell className="w-4 h-4" />,
      badge: activeAlertCount 
    },
    { id: 'analytics', label: 'Analytics & Reports', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'twin', label: '3D Digital Twin', icon: <Box className="w-4 h-4" /> },
    { id: 'settings', label: 'Edge & Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const handleNavClick = (route: AdminRoute) => {
    onNavigate(route);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Dark Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-[#151726]/60 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar / Mobile Drawer Container */}
      <aside className={`
        bg-[#FFFFFF] border-r border-[#E7E5DD] flex flex-col justify-between shrink-0 font-body select-none
        lg:w-64 lg:flex lg:h-[calc(100vh-57px)] lg:sticky lg:top-[57px] lg:z-20
        ${isMobileOpen 
          ? 'fixed inset-y-0 left-0 w-72 z-50 h-full shadow-2xl animate-in slide-in-from-left duration-200 flex' 
          : 'hidden lg:flex'}
      `}>
        {/* Top Branding & Main Nav */}
        <div className="p-4 flex flex-col gap-5 overflow-y-auto">
          {/* Brand Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#151726] text-white flex items-center justify-center shadow-md relative">
                <ShieldCheck className="w-6 h-6 text-[#2C7BE5]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#22D3A6] absolute -top-0.5 -right-0.5 ring-2 ring-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-heading font-bold text-lg text-[#151726] tracking-tight leading-tight">
                  CrowdShield
                </span>
                <span className="text-[11px] font-mono-num text-[#5B5F73]">
                  AI Command Deck v3.4
                </span>
              </div>
            </div>

            {/* Mobile Drawer Close Button */}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg hover:bg-[#FAFAF7] text-[#5B5F73] hover:text-[#151726] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

        {/* Status Indicator Pill */}
        <div className="bg-[#FAFAF7] border border-[#E7E5DD] p-2.5 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isScenarioActive ? 'bg-[#FF3B5C] animate-ping' : 'bg-[#22D3A6]'}`} />
            <span className="font-semibold text-[#151726]">
              {isScenarioActive ? 'CRISIS ELEVATED' : 'SYSTEM OPTIMAL'}
            </span>
          </div>
          <span className="font-mono-num text-[11px] text-[#5B5F73]">
            {isScenarioActive ? 'CRITICAL' : 'SAFE'}
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex flex-col gap-1">
          <div className="text-[11px] font-bold text-[#5B5F73] uppercase tracking-wider px-3 py-1">
            Navigation
          </div>
          {navItems.map((item) => {
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-[#2C7BE5] text-white shadow-sm'
                    : 'text-[#5B5F73] hover:text-[#151726] hover:bg-[#FAFAF7]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <span className="font-heading tracking-wide">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-[10px] font-mono-num px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-[#FF3B5C] text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls & Solid Red Emergency Broadcast Button */}
      <div className="p-4 border-t border-[#E7E5DD] flex flex-col gap-3 bg-[#FAFAF7]/50">
        {/* EMERGENCY BROADCAST BUTTON (Solid Red #FF3B5C) */}
        <button
          onClick={onOpenEmergencyBroadcast}
          className="w-full bg-[#FF3B5C] hover:bg-[#e02e4d] text-white p-3 rounded-xl font-heading font-bold text-xs flex items-center justify-between shadow-[0_4px_14px_rgba(255,59,92,0.35)] transition-all cursor-pointer active:scale-[0.98]"
        >
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 animate-pulse" />
            <span>EMERGENCY BROADCAST</span>
          </div>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Sub Links */}
        <div className="flex items-center justify-between px-1 text-xs text-[#5B5F73]">
          <button
            onClick={onOpenSupportModal}
            className="flex items-center gap-1.5 hover:text-[#151726] transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#2C7BE5]" />
            <span>Support</span>
          </button>

          <button
            onClick={onOpenLogsModal}
            className="flex items-center gap-1.5 hover:text-[#151726] transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#7C6CFF]" />
            <span>System Logs</span>
          </button>
        </div>
      </div>
    </aside>
  </>
);
};
