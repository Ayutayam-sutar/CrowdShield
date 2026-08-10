export type ViewMode = 'auth' | 'admin' | 'citizen';

export type AdminRoute =
  | 'dashboard'
  | 'map'
  | 'cameras'
  | 'alerts'
  | 'analytics'
  | 'twin'
  | 'settings';

export type CitizenRoute =
  | 'home'
  | 'map'
  | 'alerts'
  | 'report'
  | 'settings';

export type RiskLevel = 'safe' | 'caution' | 'warning' | 'critical';

export interface PolygonPoint {
  lat: number;
  lng: number;
}

export interface EvacuationRoute {
  status: 'SUCCESS' | 'BLOCKED' | 'ERROR';
  message: string;
  path_nodes?: string[];
  cost?: number;
  target_exit?: string;
}
export interface VenueZone {
  id: string;
  name: string;
  code: string;
  sector: string;
  density: number; // people per sq meter
  maxCapacity: number;
  currentHeadcount: number;
  flowRate: number; // people per min
  riskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  trend: 'up' | 'down' | 'stable';
 polygon: [number, number][]; // lat, lng pairs
  center: [number, number];
  gateStatus: 'open' | 'restricted' | 'closed' | 'evacuation' | 'one_way';
  inferenceMs?: number;
  evacuationRoute?: EvacuationRoute;
}

export interface YoloDetection {
  id: string;
  label: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number }; // percentages
  type: 'person' | 'backlog' | 'velocity_anomaly';
}

export interface CCTVFeed {
  id: string;
  name: string;
  location: string;
  zoneId: string;
  status: 'online' | 'warning' | 'offline';
  fps: number;
  personCount: number;
  imageUrl: string;
  yoloDetections: YoloDetection[];
  edgeNodeId: string;
}

export interface CrowdAlert {
  id: string;
  title: string;
  zoneId: string;
  zoneName: string;
  riskLevel: RiskLevel;
  density: number;
  flowRate: number;
  timestamp: string;
  category: 'Overcrowding' | 'Gate Bottleneck' | 'Sudden Surge' | 'Sensor Anomaly' | 'Medical Distress' | '👤 Citizen Sourced Alert';
  status: 'active' | 'investigating' | 'dispatched' | 'resolved';
  sentinelAnalysis: string;
  recommendedActions: {
    id: string;
    actionText: string;
    impact: string;
    targetGateOrZone: string;
  }[];
}

export type SupportedLanguage = 'en' | 'hi' | 'od' | 'bn' | 'ta';

export interface BhashiniTranslation {
  lang: SupportedLanguage;
  langName: string;
  announcementText: string;
  audioDurationSec: number;
}

export interface CitizenReport {
  id: string;
  category: 'Overcrowding' | 'Medical Emergency' | 'Hazard' | 'Panic / Commotion';
  location: string;
  photoUrl?: string;
  videoUrl?: string;
  mediaType?: 'image' | 'video';
  description: string;
  timestamp: string;
  status: 'pending' | 'dispatched' | 'resolved';
  upvotes: number;
  latitude?: number;
  longitude?: number;
}

export type NetworkMode = 'cloud' | 'edge';

export interface VenueInfo {
  id: string;
  name: string;
  location: string;
  centerCoords: [number, number];
  totalCapacity: number;
  currentTotalHeadcount: number;
  activeZonesCount: number;
  affectedZonesCount: number;
}

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'critical' | 'warning' | 'info';
  timestamp: string;
  zoneId?: string;
}

