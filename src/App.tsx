import React, { useState, useEffect } from 'react';
import { 
  ViewMode, 
  AdminRoute, 
  VenueInfo, 
  NetworkMode, 
  SupportedLanguage,
  VenueZone,
  CrowdAlert,
  CCTVFeed,
  CitizenReport,
  ToastNotification
} from './types';
import { 
  INITIAL_VENUES, 
  INITIAL_ZONES, 
  INITIAL_ALERTS, 
  INITIAL_CCTV_FEEDS, 
  INITIAL_CITIZEN_REPORTS 
} from './data/mockData';

// Layout & Modals
import { HeaderTopBar } from './components/common/HeaderTopBar';
import { LeftSidebar } from './components/common/LeftSidebar';
import { RoleSwitcher } from './components/common/RoleSwitcher';
import { ComplianceFooter } from './components/common/ComplianceFooter';
import { EmergencyBroadcastModal } from './components/admin/EmergencyBroadcastModal';
import { VoiceAssistantModal } from './components/common/VoiceAssistantModal';
import { SupportModal } from './components/common/SupportModal';
import { SystemLogsModal } from './components/common/SystemLogsModal';
import { AuthView } from './components/common/AuthView';
import { ToastContainer } from './components/common/ToastContainer';

// Admin Views
import { DashboardView } from './components/admin/DashboardView';
import { LiveMapView } from './components/admin/LiveMapView';
import { CamerasView } from './components/admin/CamerasView';
import { AlertsView } from './components/admin/AlertsView';
import { AnalyticsView } from './components/admin/AnalyticsView';
import { DigitalTwinView } from './components/admin/DigitalTwinView';
import { SettingsView } from './components/admin/SettingsView';

// Citizen View
import { CitizenPortalView } from './components/citizen/CitizenPortalView';

export default function App() {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('auth');
  const [adminRoute, setAdminRoute] = useState<AdminRoute>('dashboard');
  const [venues, setVenues] = useState<VenueInfo[]>(INITIAL_VENUES);
  const [selectedVenue, setSelectedVenue] = useState<VenueInfo>(INITIAL_VENUES[0]);
  const [networkMode, setNetworkMode] = useState<NetworkMode>('edge');
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [isScenarioActive, setIsScenarioActive] = useState<boolean>(false);

  // Core Data Collections State
  const [zones, setZones] = useState<VenueZone[]>(INITIAL_ZONES);
  const [alerts, setAlerts] = useState<CrowdAlert[]>(INITIAL_ALERTS);
  const [cctvFeeds, setCctvFeeds] = useState<CCTVFeed[]>(INITIAL_CCTV_FEEDS);
  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>(INITIAL_CITIZEN_REPORTS);

  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Modals & Drawers
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEmergencyBroadcastOpen, setIsEmergencyBroadcastOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

  // Helper function to dispatch Toast Notifications for Admins
  const addToastNotification = (
    title: string,
    message: string,
    type: 'critical' | 'warning' | 'info' = 'critical',
    zoneId?: string
  ) => {
    const newToast: ToastNotification = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      zoneId,
    };
    setToasts((prev) => [newToast, ...prev]);

    // Auto dismiss toast after 8 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 8000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Automatic Crowd Alert Generation if Zone Density Exceeds 85% Threshold
  const checkAndGenerateCrowdAlerts = (zonesList: VenueZone[]) => {
    zonesList.forEach((zone) => {
      const capacityPercent = zone.maxCapacity > 0
        ? Math.round((zone.currentHeadcount / zone.maxCapacity) * 100)
        : Math.round((zone.density / 5.0) * 100);

      const exceeds85 = capacityPercent >= 85 || zone.density >= 4.25 || zone.riskScore >= 85;

      if (exceeds85) {
        setAlerts((prevAlerts) => {
          const existing = prevAlerts.find((a) => a.zoneId === zone.id && a.status === 'active');
          if (existing) return prevAlerts;

          const newAlert: CrowdAlert = {
            id: `alert-auto-${zone.id}-${Date.now()}`,
            title: `CRITICAL CROWD DENSITY: ${zone.name} (${capacityPercent}% Load)`,
            zoneId: zone.id,
            zoneName: zone.name,
            riskLevel: 'critical',
            density: zone.density,
            flowRate: zone.flowRate,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            category: 'Overcrowding',
            status: 'active',
            sentinelAnalysis: `Automated Sentinel AI Threshold Alert: ${zone.name} exceeded 85% capacity safety threshold with ${zone.density.toFixed(1)} p/m² density (${capacityPercent}% headcount load). High crowd crush risk detected. Immediate diversion recommended.`,
            recommendedActions: [
              {
                id: `act-1-${zone.id}`,
                actionText: `Open Auxiliary Emergency Gates near ${zone.name}`,
                impact: 'Immediate -40% headcount relief',
                targetGateOrZone: zone.name,
              },
              {
                id: `act-2-${zone.id}`,
                actionText: 'Broadcast Bhashini Multilingual PA Diversion Announcement',
                impact: 'Redirect incoming crowd to adjacent Sector 1 & 4',
                targetGateOrZone: zone.name,
              },
            ],
          };

          // Display Toast Notification for Admins
          addToastNotification(
            `CROWD THRESHOLD ALERT (>85% Exceeded)`,
            `Zone ${zone.name} reached ${capacityPercent}% capacity load (${zone.density.toFixed(1)} p/m²). Emergency alert logged in system.`,
            'critical',
            zone.id
          );

          return [newAlert, ...prevAlerts];
        });
      }
    });
  };

  // Monitor zones for threshold breaches
  useEffect(() => {
    checkAndGenerateCrowdAlerts(zones);
  }, [zones]);

  // Handlers
  const handleTriggerScenario = () => {
    setIsScenarioActive(true);
    setZones((prevZones) =>
      prevZones.map((z) =>
        z.id === 'z-2' || z.id === 'z-3'
          ? {
              ...z,
              riskScore: 92,
              riskLevel: 'critical',
              density: 4.8,
              currentHeadcount: 3840,
              maxCapacity: 4000,
              flowRate: 10,
              gateStatus: 'restricted',
            }
          : z
      )
    );
  };

  const handleResetScenario = () => {
    setIsScenarioActive(false);
    setZones(INITIAL_ZONES);
  };

  const handleToggleNetworkMode = () => {
    setNetworkMode((prev) => (prev === 'cloud' ? 'edge' : 'cloud'));
  };

  const handleAddCitizenReport = (
    report: Omit<CitizenReport, 'id' | 'timestamp' | 'status' | 'upvotes'>
  ) => {
    const newReport: CitizenReport = {
      ...report,
      id: `rep-${Date.now()}`,
      timestamp: 'Just now',
      status: 'pending',
      upvotes: 1,
    };
    setCitizenReports((prev) => [newReport, ...prev]);
  };

  const handleVoiceCommand = (command: string) => {
    const lower = command.toLowerCase();
    if (lower.includes('map')) setAdminRoute('map');
    else if (lower.includes('cctv') || lower.includes('cam')) setAdminRoute('cameras');
    else if (lower.includes('alert')) setAdminRoute('alerts');
    else if (lower.includes('twin')) setAdminRoute('twin');
    else if (lower.includes('edge')) setNetworkMode('edge');
    else if (lower.includes('evacuat') || lower.includes('emergency')) setIsEmergencyBroadcastOpen(true);
    else setAdminRoute('dashboard');
  };

  const activeAlertCount = alerts.filter((a) => a.status === 'active').length;

  // Render Auth View
  if (viewMode === 'auth') {
    return (
      <AuthView
        onLogin={(mode) => setViewMode(mode)}
      />
    );
  }

  // Render Citizen View
  if (viewMode === 'citizen') {
    return (
      <div className="min-h-screen bg-[#FAFAF7]">
        <CitizenPortalView
          reports={citizenReports}
          onSubmitReport={handleAddCitizenReport}
          isScenarioActive={isScenarioActive}
          onLogout={() => setViewMode('auth')}
        />
        <RoleSwitcher
          currentView={viewMode}
          onSwitchView={(mode) => setViewMode(mode)}
          isScenarioActive={isScenarioActive}
          onResetScenario={handleResetScenario}
        />
      </div>
    );
  }

  // Render Admin Layout
  return (
    <div className="min-h-screen bg-[#FAFAF7] flex flex-col font-body text-[#151726]">
      {/* Toast Notifications */}
      <ToastContainer
        toasts={toasts}
        onDismiss={handleDismissToast}
        onInspectAlert={(zoneId) => setAdminRoute('alerts')}
      />

      {/* Top Header Bar */}
      <HeaderTopBar
        venues={venues}
        selectedVenue={selectedVenue}
        onSelectVenue={(v) => setSelectedVenue(v)}
        networkMode={networkMode}
        onToggleNetworkMode={handleToggleNetworkMode}
        language={language}
        onChangeLanguage={(lang) => setLanguage(lang)}
        isScenarioActive={isScenarioActive}
        onTriggerScenario={handleTriggerScenario}
        onResetScenario={handleResetScenario}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
        onSearch={() => {}}
        activeAlertCount={activeAlertCount}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex flex-1 relative">
        {/* Left Sticky Sidebar / Mobile Drawer */}
        <LeftSidebar
          currentRoute={adminRoute}
          onNavigate={(route) => setAdminRoute(route)}
          onOpenEmergencyBroadcast={() => setIsEmergencyBroadcastOpen(true)}
          onOpenSupportModal={() => setIsSupportModalOpen(true)}
          onOpenLogsModal={() => setIsLogsModalOpen(true)}
          activeAlertCount={activeAlertCount}
          isScenarioActive={isScenarioActive}
          isMobileOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Dynamic Route Content Area */}
        <main className="flex-1 min-w-0 pb-28 sm:pb-32">
          {adminRoute === 'dashboard' && (
            <DashboardView
              zones={zones}
              alerts={alerts}
              isScenarioActive={isScenarioActive}
              onNavigateToMap={() => setAdminRoute('map')}
              onNavigateToAlerts={() => setAdminRoute('alerts')}
              onOpenEmergencyBroadcast={() => setIsEmergencyBroadcastOpen(true)}
            />
          )}

          {adminRoute === 'map' && (
            <LiveMapView
              selectedVenue={selectedVenue}
              zones={zones}
              cctvFeeds={cctvFeeds}
            />
          )}

          {adminRoute === 'cameras' && (
            <CamerasView cctvFeeds={cctvFeeds} />
          )}

          {adminRoute === 'alerts' && (
            <AlertsView
              alerts={alerts}
              cctvFeeds={cctvFeeds}
              selectedLanguage={language}
              onChangeLanguage={(lang) => setLanguage(lang)}
              onOpenEmergencyBroadcast={() => setIsEmergencyBroadcastOpen(true)}
            />
          )}

          {adminRoute === 'analytics' && <AnalyticsView />}

          {adminRoute === 'twin' && (
            <DigitalTwinView
              zones={zones}
              isScenarioActive={isScenarioActive}
              onTriggerScenario={handleTriggerScenario}
            />
          )}

          {adminRoute === 'settings' && (
            <SettingsView
              networkMode={networkMode}
              onToggleNetworkMode={handleToggleNetworkMode}
            />
          )}
        </main>
      </div>

      {/* Compliance Footer */}
      <ComplianceFooter />

      {/* Role Switcher Pill */}
      <RoleSwitcher
        currentView={viewMode}
        onSwitchView={(mode) => setViewMode(mode)}
        isScenarioActive={isScenarioActive}
        onResetScenario={handleResetScenario}
      />

      {/* Global Modals */}
      <EmergencyBroadcastModal
        isOpen={isEmergencyBroadcastOpen}
        onClose={() => setIsEmergencyBroadcastOpen(false)}
        selectedLanguage={language}
      />

      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onExecuteCommand={handleVoiceCommand}
      />

      <SupportModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
      />

      <SystemLogsModal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
        isScenarioActive={isScenarioActive}
      />
    </div>
  );
}

