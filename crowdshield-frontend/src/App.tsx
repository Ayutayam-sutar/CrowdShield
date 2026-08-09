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
import { useAuth } from './context/AuthContext';
import { wsService } from './services/websocket';

// Admin Views
import { DashboardView } from './components/admin/DashboardView';
import { LiveMapView } from './components/admin/LiveMapView';
import { CamerasView } from './components/admin/CamerasView';
import { AlertsView } from './components/admin/AlertsView';
import { AnalyticsView } from './components/admin/AnalyticsView';
import { DigitalTwinView } from './components/admin/DigitalTwinView';
import { EdgeSettingsView } from './components/admin/EdgeSettingsView';

// Citizen View
import { CitizenPortalView } from './components/citizen/CitizenPortalView';

import api from './utils/api';

export function mapBackendZoneToFrontend(raw: any): VenueZone {
  // Bhubaneswar zone offsets so each zone gets distinct map placement
  const ZONE_OFFSETS: Record<string, [number, number]> = {
    'z-1': [20.2516, 85.7968], 'z-01': [20.2516, 85.7968],
    'z-2': [20.2476, 85.7968], 'z-02': [20.2476, 85.7968],
    'z-3': [20.2516, 85.8008], 'z-03': [20.2516, 85.8008],
    'z-4': [20.2476, 85.8008], 'z-04': [20.2476, 85.8008],
  };
  const fallback = ZONE_OFFSETS[(raw.id || '').toLowerCase()] || [20.2496, 85.7988];
  const centerLat = raw.center_lat || (Array.isArray(raw.center) ? raw.center[0] : fallback[0]);
  const centerLng = raw.center_lng || (Array.isArray(raw.center) ? raw.center[1] : fallback[1]);
  return {
    id: raw.id,
    name: raw.name || raw.code || raw.id,
    code: raw.code || raw.id,
    sector: raw.sector || 'Sector General',
    density: raw.density ?? 0,
    maxCapacity: raw.capacity_limit ?? raw.maxCapacity ?? 3500,
    currentHeadcount: raw.current_headcount ?? raw.currentHeadcount ?? 0,
    flowRate: raw.flow_rate ?? raw.flowRate ?? 0,
    riskScore: raw.risk_score ?? raw.riskScore ?? 0,
    riskLevel: (raw.risk_level ?? raw.riskLevel ?? 'safe').toLowerCase() as any,
    trend: (raw.trend ?? 'stable').toLowerCase() as any,
    polygon: raw.coordinates_json?.polygon || raw.polygon || [
      [centerLat - 0.001, centerLng - 0.001],
      [centerLat + 0.001, centerLng - 0.001],
      [centerLat + 0.001, centerLng + 0.001],
      [centerLat - 0.001, centerLng + 0.001]
    ],
    center: [centerLat, centerLng],
    gateStatus: (raw.gate_status ?? raw.gateStatus ?? 'open').toLowerCase() as any,
  };
}

export function mapBackendVenueToFrontend(raw: any): VenueInfo {
  const mappedZones = (raw.zones || []).map(mapBackendZoneToFrontend);
  const totalHeadcount = mappedZones.reduce((acc: number, z: VenueZone) => acc + z.currentHeadcount, 0);
  const affected = mappedZones.filter((z: VenueZone) => z.riskLevel === 'warning' || z.riskLevel === 'critical').length;

  return {
    id: raw.id,
    name: raw.name,
    location: raw.location,
    centerCoords: [raw.gps_center_lat || 20.2496, raw.gps_center_lng || 85.7988],
    totalCapacity: raw.total_capacity || 60000,
    currentTotalHeadcount: totalHeadcount,
    activeZonesCount: mappedZones.length,
    affectedZonesCount: affected,
  };
}

export default function App() {
  const { isAuthenticated, role, logout } = useAuth();

  // State
  const [viewMode, setViewMode] = useState<ViewMode>('auth');
  const [adminRoute, setAdminRoute] = useState<AdminRoute>('dashboard');
  const [venues, setVenues] = useState<VenueInfo[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<VenueInfo | null>(null);
  const [networkMode, setNetworkMode] = useState<NetworkMode>('edge');
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [isScenarioActive, setIsScenarioActive] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCloudSyncLost, setIsCloudSyncLost] = useState<boolean>(false);

  // Core Data Collections State
  const [zones, setZones] = useState<VenueZone[]>([]);
  const [alerts, setAlerts] = useState<CrowdAlert[]>(INITIAL_ALERTS);
  const [cctvFeeds, setCctvFeeds] = useState<CCTVFeed[]>(INITIAL_CCTV_FEEDS);
  const [citizenReports, setCitizenReports] = useState<CitizenReport[]>(INITIAL_CITIZEN_REPORTS);

  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Audit Logs State
  const [recentLogs, setRecentLogs] = useState<{ timestamp: string; action: string; source: string; type: 'success' | 'warning' | 'info' }[]>([
    { timestamp: new Date(Date.now() - 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), source: 'OPERATOR_01', action: 'INITIATED REMOTE UNLOCK: GATE B TURNSTILES', type: 'info' },
    { timestamp: new Date(Date.now() - 120000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), source: 'SENTINEL_AI', action: 'ESCALATED RISK LEVEL TO CRITICAL FOR SECTOR 7G', type: 'warning' },
    { timestamp: new Date(Date.now() - 180000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), source: 'OPERATOR_02', action: 'DISPATCHED BHASHINI MULTILINGUAL ANNOUNCEMENT (HINDI/ODIA)', type: 'info' },
    { timestamp: new Date(Date.now() - 240000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), source: 'A_STAR_ROUTER', action: 'DYNAMIC REROUTE ACTIVE: DIVERTED 1,200 PAX TO AUX GATE 4', type: 'success' },
    { timestamp: new Date(Date.now() - 300000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), source: 'SYSTEM_NODE', action: 'EDGE SQLITE DB SYNC OK · 0 LOSS PACKETS', type: 'info' },
  ]);

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

  // Fetch Live Venues and Zones from FastAPI backend
  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const [venuesRes, zonesRes] = await Promise.all([
          api.get('/venues').catch(() => ({ data: [] })),
          api.get('/zones').catch(() => ({ data: [] })),
        ]);

        const rawVenues = Array.isArray(venuesRes.data) ? venuesRes.data : [];
        const rawZones = Array.isArray(zonesRes.data) ? zonesRes.data : [];

        const mappedVenues = rawVenues.map(mapBackendVenueToFrontend);
        const mappedZones = rawZones.map(mapBackendZoneToFrontend);

        setVenues(mappedVenues);
        if (mappedVenues.length > 0) {
          setSelectedVenue(mappedVenues[0]);
        } else {
          setSelectedVenue(null);
        }

        if (mappedZones.length > 0) {
          setZones(mappedZones);
          wsService.subscribeToZone(mappedZones[0].id);
        } else {
          setZones([]);
        }
      } catch (err) {
        console.error('[API] Failed to fetch live venues and zones from backend:', err);
      }
    };

    if (isAuthenticated) {
      fetchLiveData();
    }
  }, [isAuthenticated]);

  // Handle Venue selection and subscribe to its primary zone
  const handleSelectVenue = (venue: VenueInfo) => {
    setSelectedVenue(venue);
    api.get('/zones').then((res) => {
      const rawZones = Array.isArray(res.data) ? res.data : [];
      const mappedZones = rawZones.map(mapBackendZoneToFrontend);
      if (mappedZones.length > 0) {
        setZones(mappedZones);
        wsService.subscribeToZone(mappedZones[0].id);
      }
    }).catch((err) => {
      console.error('[API] Failed to fetch zones for selected venue:', err);
    });
  };

  // Monitor zones for threshold breaches
  useEffect(() => {
    checkAndGenerateCrowdAlerts(zones);
  }, [zones]);

  // WebSocket Connection & Real-Time Telemetry Subscription
  useEffect(() => {
    if (isAuthenticated) {
      wsService.connect();

      const unsubscribe = wsService.subscribe((data) => {
        if (data.event === 'TELEMETRY_UPDATE' && data.zone) {
          const updatedZone = mapBackendZoneToFrontend(data.zone);
          // Update existing zone or dynamically insert new zone (e.g., z-3)
          setZones((prevZones) => {
            const exists = prevZones.some((z) => z.id === updatedZone.id);
            if (exists) {
              return prevZones.map((z) => (z.id === updatedZone.id ? { ...z, ...updatedZone } : z));
            } else {
              return [...prevZones, updatedZone];
            }
          });

          // Handle new alerts
          if (data.alert) {
            setAlerts((prevAlerts) => {
              const exists = prevAlerts.find(a => a.id === data.alert!.id || (a.zoneId === data.alert!.zoneId && a.status === 'active'));
              if (exists) return prevAlerts;
              return [data.alert!, ...prevAlerts];
            });

            addToastNotification(
              `CROWD SURGE ALERT`,
              `Zone ${data.zone.id} flagged by ML Risk Engine. Overrides applied.`,
              data.alert.riskLevel === 'critical' ? 'critical' : 'warning',
              data.zone.id
            );
          }
        } else if (data.event === 'RESOLVED_BY_VOLUNTEER' && data.alert_id) {
          setAlerts((prevAlerts) =>
            prevAlerts.map(a =>
              a.id === data.alert_id
                ? { ...a, status: 'resolved', resolvedBy: data.resolved_by }
                : a
            )
          );

          addToastNotification(
            `ALERT RESOLVED`,
            `Alert #${data.alert_id} was resolved by volunteer ${data.resolved_by || 'Unknown'}`,
            'info'
          );
        }
      });

      return () => {
        unsubscribe();
        wsService.disconnect();
      };
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleNetworkStatus = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail.status === 'offline') {
        setIsCloudSyncLost(true);
      } else {
        setIsCloudSyncLost(false);
      }
    };

    const handleVoiceCommandEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      addToastNotification(
        '🎙️ Voice Command Recognized',
        customEvent.detail,
        'info'
      );
    };

    const handleSystemDispatchEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { type, message } = customEvent.detail || {};
      addToastNotification(
        '🚨 Emergency System Dispatch',
        message || 'Dispatched intervention payload to Edge Controller.',
        type === 'warning' ? 'warning' : 'info'
      );
      setRecentLogs((prev) => [
        {
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          source: 'DISPATCH_PANEL',
          action: (message || 'DISPATCHED EMERGENCY INTERVENTION').toUpperCase(),
          type: type || 'info'
        },
        ...prev
      ]);
    };

    window.addEventListener('network_status', handleNetworkStatus);
    window.addEventListener('voice_command_executed', handleVoiceCommandEvent);
    window.addEventListener('system_dispatch', handleSystemDispatchEvent);

    return () => {
      window.removeEventListener('network_status', handleNetworkStatus);
      window.removeEventListener('voice_command_executed', handleVoiceCommandEvent);
      window.removeEventListener('system_dispatch', handleSystemDispatchEvent);
    };
  }, []);

  // Handlers
  const handleTriggerScenario = () => {
    setIsScenarioActive(true);
    setZones((prevZones) =>
      prevZones.map((z) => {
        const zid = (z.id || '').toLowerCase();

        // Include CAM-04 (z-4 / z-04) alongside CAM-03 (z-3 / z-03)
        if (
          zid.includes('z-3') ||
          zid.includes('z-03') ||
          zid.includes('z-4') ||
          zid.includes('z-04')
        ) {
          return {
            ...z,
            riskScore: 95,
            riskLevel: 'critical',
            density: 4.8,
            currentHeadcount: 3840,
            maxCapacity: 4000,
            flowRate: 12,
            gateStatus: 'restricted',
          };
        }
        return z;
      })
    );
  };

  const handleResetScenario = () => {
    setIsScenarioActive(false);
    setZones(INITIAL_ZONES);
  };

  const handleToggleNetworkMode = () => {
    setNetworkMode((prev) => (prev === 'cloud' ? 'edge' : 'cloud'));
  };

  const handleAddCitizenReport = async (
    report: Omit<CitizenReport, 'id' | 'timestamp' | 'status' | 'upvotes'>
  ) => {
    try {
      const res = await api.post('/citizen-reports/', {
        category: report.category,
        description: report.description,
        location_name: report.location,
        latitude: report.latitude || 28.5832,
        longitude: report.longitude || 77.2318,
        media_url: report.photoUrl || report.videoUrl,
        media_type: report.mediaType,
      });

      const newReport: CitizenReport = {
        ...report,
        id: res.data.id || `rep-${Date.now()}`,
        timestamp: 'Just now',
        status: 'pending',
        upvotes: 1,
      };
      setCitizenReports((prev) => [newReport, ...prev]);

      // Inject into Alerts queue
      const newAlert: CrowdAlert = {
        id: `alert-citizen-${Date.now()}`,
        title: `CITIZEN REPORT: ${report.category}`,
        zoneId: 'z-general',
        zoneName: report.location,
        riskLevel: 'warning',
        density: 0,
        flowRate: 0,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        category: '👤 Citizen Sourced Alert',
        status: 'active',
        sentinelAnalysis: `Citizen reported: ${report.description}`,
        recommendedActions: []
      };
      setAlerts((prev) => [newAlert, ...prev]);
    } catch (err) {
      console.error('Failed to submit citizen report:', err);
      // Fallback local update
      const newReport: CitizenReport = {
        ...report,
        id: `rep-${Date.now()}`,
        timestamp: 'Just now',
        status: 'pending',
        upvotes: 1,
      };
      setCitizenReports((prev) => [newReport, ...prev]);
    }
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

  // Safe filtering: Add optional chaining to prevent silent UI crashes if a zone name is missing
  const displayedZones = zones.filter((z) =>
    (z?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (z?.code || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Render Auth View
  if (!isAuthenticated) {
    return (
      <AuthView
        onLogin={(mode) => setViewMode(mode)}
      />
    );
  }

  // Render Citizen View
  if (role === 'CITIZEN' || role === 'VOLUNTEER' || viewMode === 'citizen') {
    return (
      <div className="min-h-screen bg-[#FAFAF7]">
        <CitizenPortalView
          reports={citizenReports}
          onSubmitReport={handleAddCitizenReport}
          isScenarioActive={isScenarioActive}
          onLogout={logout}
          alerts={alerts}
        />
        <RoleSwitcher
          currentView="citizen"
          onSwitchView={(mode) => {
            // Can't switch to admin if not admin
            if (role !== 'ADMIN' && mode === 'admin') return;
            setViewMode(mode);
          }}
          isScenarioActive={isScenarioActive}
          onResetScenario={handleResetScenario}
        />
      </div>
    );
  }

  // Render Admin Layout
  if (role !== 'ADMIN') return null; // Safety check

  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col font-body text-slate-100">
      {/* Toast Notifications */}
      <ToastContainer
        toasts={toasts}
        onDismiss={handleDismissToast}
        onInspectAlert={(zoneId) => setAdminRoute('alerts')}
      />

      {/* Cloud Sync Lost Amber Banner */}
      {isCloudSyncLost && (
        <div className="w-full bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm font-bold font-heading shadow-md z-40 relative flex items-center justify-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          Cloud Sync Lost. Operating on Local Edge Cache.
        </div>
      )}

      {/* Top Header Bar */}
      <HeaderTopBar
        venues={venues}
        selectedVenue={selectedVenue}
        onSelectVenue={(v) => handleSelectVenue(v)}
        networkMode={networkMode}
        onToggleNetworkMode={handleToggleNetworkMode}
        language={language}
        onChangeLanguage={(lang) => setLanguage(lang)}
        isScenarioActive={isScenarioActive}
        onTriggerScenario={handleTriggerScenario}
        onResetScenario={handleResetScenario}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
        onSearch={setSearchQuery}
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
              zones={displayedZones}
              alerts={alerts}
              isScenarioActive={isScenarioActive}
              onNavigateToMap={() => setAdminRoute('map')}
              onNavigateToAlerts={() => setAdminRoute('alerts')}
              onOpenEmergencyBroadcast={() => setIsEmergencyBroadcastOpen(true)}
              recentLogs={recentLogs}
            />
          )}

          {adminRoute === 'map' && (
            <LiveMapView
              selectedVenue={selectedVenue}
              zones={displayedZones}
              cctvFeeds={cctvFeeds}
            />
          )}

          {adminRoute === 'cameras' && (
            <CamerasView cctvFeeds={cctvFeeds} zones={displayedZones} />
          )}

          {adminRoute === 'alerts' && (
            <AlertsView
              alerts={alerts}
              cctvFeeds={cctvFeeds}
              zones={zones}
              selectedLanguage={language}
              onChangeLanguage={(lang) => setLanguage(lang)}
              onOpenEmergencyBroadcast={() => setIsEmergencyBroadcastOpen(true)}
            />
          )}

          {adminRoute === 'analytics' && <AnalyticsView zones={displayedZones} />}

          {adminRoute === 'twin' && (
            <DigitalTwinView
              zones={displayedZones}
            />
          )}

          {adminRoute === 'settings' && (
            <EdgeSettingsView
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
        zones={zones}
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

