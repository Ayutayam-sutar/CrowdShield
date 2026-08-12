import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Tooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Footprints, Clock, AlertTriangle, Maximize2, Minimize2, Route } from 'lucide-react';
import api from '../../utils/api';
import { VenueZone } from '../../types';

/* ─── MAP HELPERS ────────────────────────────────────── */

const MapUpdater: React.FC<{ center: [number, number]; resizeTrigger?: boolean }> = ({ center, resizeTrigger }) => {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom()); }, [center, map]);
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [map, resizeTrigger]);
  return null;
};

const RouteBoundsFitter: React.FC<{ coordinates: [number, number][] }> = ({ coordinates }) => {
  const map = useMap();
  useEffect(() => {
    if (coordinates.length > 1) {
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [coordinates, map]);
  return null;
};

const getRiskColor = (riskLevel: string): string => {
  switch ((riskLevel || '').toLowerCase()) {
    case 'critical': return '#EF4444';
    case 'warning': return '#F97316';
    case 'caution': return '#EAB308';
    case 'safe':
    default: return '#10B981';
  }
};

/* ─── CUSTOM ICONS ───────────────────────────────────── */

const createBlueDotIcon = () =>
  L.divIcon({
    className: 'custom-blue-dot',
    html: `
      <div style="position:relative;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;width:100%;height:100%;border-radius:50%;background:rgba(99,102,241,0.3);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
        <div style="width:14px;height:14px;border-radius:50%;background:#6366F1;border:3px solid #fff;box-shadow:0 2px 8px rgba(99,102,241,0.4);"></div>
      </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const createExitIcon = () =>
  L.divIcon({
    className: 'custom-exit-icon',
    html: `
      <div style="background:#10B981;color:#fff;font-weight:700;font-size:10px;padding:5px 10px;border-radius:10px;border:2px solid #fff;box-shadow:0 3px 12px rgba(16,185,129,0.3);display:flex;align-items:center;gap:4px;white-space:nowrap;">
        ✓ SAFE EXIT
      </div>`,
    iconSize: [85, 28],
    iconAnchor: [42, 14],
  });

/* ─── PROPS ──────────────────────────────────────────── */

interface CitizenEvacuationMapProps {
  isScenarioActive: boolean;
  userLocation: { lat: number; lng: number };
  zones: VenueZone[];
  venueId?: string;
  venueName?: string;
}

/* ─── COMPONENT ──────────────────────────────────────── */

export const CitizenEvacuationMap: React.FC<CitizenEvacuationMapProps> = ({
  isScenarioActive,
  userLocation,
  zones = [],
  venueId = 'soa-iter-01',
  venueName = 'SOA ITER Campus',
}) => {
  const [pathCoordinates, setPathCoordinates] = useState<[number, number][]>([
    [userLocation.lat, userLocation.lng],
  ]);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [directions, setDirections] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const response = await api.post('/routing/evacuate/', {
          venue_id: venueId,
          current_lat: userLocation.lat,
          current_lng: userLocation.lng,
        });
        if (response.data?.waypoints?.length > 0) {
          const coords = response.data.waypoints.map(
            (wp: any) => [wp.lat, wp.lng] as [number, number]
          );
          setPathCoordinates(coords);
          setEstimatedTime(Math.max(1, Math.round(response.data.estimated_time_minutes)));
          setDirections(
            response.data.waypoints.map((wp: any, i: number) => {
              if (i === 0) return `Start at ${wp.zone_name}`;
              if (i === response.data.waypoints.length - 1) return `Arrive at Exit: ${wp.zone_name}`;
              return `Continue through ${wp.zone_name}`;
            })
          );
        }
      } catch (err) {
        console.error('Failed to fetch evacuation route', err);
      }
    };
    fetchRoute();
  }, [isScenarioActive, userLocation, venueId]);

  const midPoint: [number, number] =
    pathCoordinates.length > 2
      ? pathCoordinates[Math.floor(pathCoordinates.length / 2)]
      : [userLocation.lat, userLocation.lng];

  return (
    <div
      className={`app-card flex flex-col font-body w-full transition-all duration-300 ${
        isExpanded
          ? 'fixed inset-0 z-[9999] rounded-none p-4 sm:p-6 bg-white'
          : 'p-4 sm:p-5 gap-4 max-w-full'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`p-2 rounded-xl shrink-0 ${
              isScenarioActive
                ? 'bg-red-50 text-red-500 border border-red-100'
                : 'bg-indigo-50 text-indigo-500 border border-indigo-100'
            }`}
          >
            <Navigation className={`w-4 h-4 sm:w-5 sm:h-5 ${isScenarioActive ? '' : 'animate-pulse'}`} />
          </div>
          <div className="min-w-0 flex flex-col">
            <h3 className="font-heading font-bold text-xs sm:text-sm text-slate-900 tracking-tight truncate flex items-center gap-2">
              Evacuation Route Map
              {isScenarioActive && (
                <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-500 text-[10px] font-mono-num font-bold uppercase border border-red-100">
                  Active
                </span>
              )}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono-num truncate">
              A* pathing · {venueName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span
            className={`px-2.5 py-1 rounded-full font-mono-num font-bold text-[10px] sm:text-[11px] flex items-center gap-1.5 ${
              isScenarioActive
                ? 'bg-red-50 text-red-500 border border-red-100'
                : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
            }`}
          >
            <Clock className="w-3 h-3" />
            {estimatedTime} min walk
          </span>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Map */}
      <div
        className={`relative w-full rounded-2xl border border-slate-200 overflow-hidden z-10 ${
          isExpanded ? 'flex-1 mt-3' : 'h-56 sm:h-64 md:h-72'
        }`}
      >
        <MapContainer
          center={[userLocation.lat, userLocation.lng]}
          zoom={17}
          scrollWheelZoom={true}
          className="w-full h-full"
          attributionControl={false}
        >
          <MapUpdater center={[userLocation.lat, userLocation.lng]} resizeTrigger={isExpanded} />
          <RouteBoundsFitter coordinates={pathCoordinates} />

          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* Zone polygons */}
          {zones.map((zone) => {
            if (!zone.polygon || zone.polygon.length === 0) return null;
            const color = getRiskColor(zone.riskLevel);
            return (
              <Polygon
                key={zone.id}
                positions={zone.polygon}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.2, weight: 2 }}
              >
                <Popup>
                  <div className="p-1 font-heading font-bold text-xs flex items-center gap-1" style={{ color }}>
                    {zone.riskLevel === 'critical' && <AlertTriangle className="w-3.5 h-3.5" />}
                    {zone.name} ({zone.riskLevel.toUpperCase()})
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {/* Route line */}
          {pathCoordinates.length > 1 && (
            <Polyline
              positions={pathCoordinates}
              pathOptions={{
                color: '#6366F1',
                weight: 5,
                dashArray: '12, 8',
                opacity: 0.85,
                lineCap: 'round',
              }}
            >
              <Tooltip position={midPoint} permanent direction="top" className="route-tooltip">
                <span>{estimatedTime}m walk</span>
              </Tooltip>
            </Polyline>
          )}

          {/* User marker */}
          <Marker position={[userLocation.lat, userLocation.lng]} icon={createBlueDotIcon()}>
            <Popup>
              <div className="p-1 font-heading font-bold text-xs text-indigo-600">● You Are Here</div>
            </Popup>
          </Marker>

          {/* Exit marker */}
          {pathCoordinates.length > 1 && (
            <Marker position={pathCoordinates[pathCoordinates.length - 1]} icon={createExitIcon()}>
              <Popup>
                <div className="p-1 font-heading font-bold text-xs text-emerald-600">✓ Safe Exit</div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Legend */}
        <div className="absolute bottom-2.5 left-2.5 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 z-[1000] text-[10px] font-mono-num flex items-center gap-3 border border-slate-200 shadow-md">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 border border-white shadow-sm" />
            <span className="font-bold text-slate-600">You</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 rounded bg-indigo-400" />
            <span className="font-bold text-indigo-500">Route</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-red-400/40 border border-red-400" />
            <span className="font-bold text-red-500">Risk</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-400/40 border border-emerald-400" />
            <span className="font-bold text-emerald-500">Safe</span>
          </div>
        </div>
      </div>

      {/* Step-by-step Directions */}
      {!isExpanded && (
        <div className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-2.5 border border-slate-100 mt-1">
          <span className="font-heading font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Route className="w-3.5 h-3.5 text-indigo-400" />
            Turn-by-Turn Directions
          </span>

          <div className="space-y-2 text-xs">
            {directions.length > 0 ? (
              directions.map((dir, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 bg-white p-2.5 rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors"
                >
                  <span
                    className={`w-5 h-5 rounded-full text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-sm ${
                      idx === directions.length - 1 ? 'bg-emerald-500' : 'bg-indigo-500'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-700 leading-tight">{dir}</span>
                </div>
              ))
            ) : (
              <div className="text-center p-3 text-slate-400">Computing optimal route...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};