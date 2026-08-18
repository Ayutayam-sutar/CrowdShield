import React, { useState, useMemo } from 'react';
import { VenueZone, CCTVFeed, VenueInfo } from '../../types';
import { MapContainer, TileLayer, Polygon, Marker, Popup, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Video,
  Layers,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  X,
  VideoOff,
  RefreshCw,
  Navigation,
  ChevronUp,
  ChevronDown,
  Activity
} from 'lucide-react';
const PORT_TUNNELS: Record<string, string> = {};
const MapUpdater: React.FC<{ center: [number, number]; resizeTrigger?: unknown }> = ({ center, resizeTrigger }) => {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  React.useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map, resizeTrigger]);
  React.useEffect(() => {
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [map]);
  return null;
};
const LocateMeControl = ({ onLocate, onError }: { onLocate: (loc: [number, number]) => void, onError: (msg: string) => void }) => {
  const map = useMap();
  const handleLocate = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
          onLocate(loc);
          map.flyTo(loc, 17);
        },
        (err) => {
          onError('Geolocation permission denied or unavailable.');
        }
      );
    } else {
      onError('Geolocation is not supported by your browser.');
    }
  };
  return (
    <div className="absolute top-4 right-4 z-[400]">
      <button
        onClick={handleLocate}
        className="bg-white/90 backdrop-blur-md p-2.5 sm:px-4 rounded-xl shadow-lg border border-slate-200 text-[#67b2b9] hover:bg-gradient-to-r hover:from-[#67b2b9] hover:to-[#648d6a] hover:text-white transition-all duration-300 flex items-center gap-2 font-bold text-sm cursor-pointer active:scale-95 group"
        title="My Location"
      >
        <Navigation className="w-5 h-5 group-hover:animate-pulse" />
        <span className="hidden sm:inline tracking-wide">Locate Me</span>
      </button>
    </div>
  );
};
export const getRiskColor = (riskLevel: string): string => {
  switch ((riskLevel || '').toLowerCase()) {
    case 'critical': return '#FF3B5C'; 
    case 'warning': return '#FF7A45'; 
    case 'caution': return '#FFB627'; 
    case 'safe':
    default: return '#22D3A6'; 
  }
};
const isLegacyPhantomZone = (id: string): boolean => /^z-0?\d$/i.test(id || '');
const getTightPolygon = (center: [number, number], existingPolygon?: any[]): [number, number][] => {
  if (Array.isArray(existingPolygon) && existingPolygon.length >= 3) {
    const lats = existingPolygon.map(p => Number(p[0]));
    const maxSpan = Math.max(...lats) - Math.min(...lats);
    if (maxSpan < 0.001) {
      return existingPolygon.map(p => [Number(p[0]), Number(p[1])]);
    }
  }
  const lat = Number(center[0]);
  const lng = Number(center[1]);
  const dLat = 0.0003; 
  const dLng = 0.0004; 
  return [
    [lat + dLat, lng - dLng],
    [lat + dLat, lng + dLng],
    [lat - dLat, lng + dLng],
    [lat - dLat, lng - dLng],
  ];
};
interface LiveMapViewProps {
  selectedVenue: VenueInfo | null;
  zones: VenueZone[];
  cctvFeeds: CCTVFeed[];
  isCctvExpanded: boolean;
  onToggleCctvExpanded: () => void;
}

export const LiveMapView: React.FC<LiveMapViewProps> = ({
  selectedVenue,
  zones = [],
  cctvFeeds = [],
  isCctvExpanded,
  onToggleCctvExpanded,
}) => {
  const [activeCameraModal, setActiveCameraModal] = useState<CCTVFeed | null>(null);
  const [failedFeeds, setFailedFeeds] = useState<Record<string, boolean>>({});
  const [streamCacheBusters, setStreamCacheBusters] = useState<Record<string, number>>({});
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [localToast, setLocalToast] = useState<string | null>(null);
const resolveStreamUrl = (url: string, feedId: string): string => {
  if (!url) return '';
  const portMatch = url.match(/:(\d+)\//);
  const port = portMatch ? portMatch[1] : (feedId.includes('ks_') ? '5001' : '5000');
  const activeTunnel = PORT_TUNNELS[port];
  if (!activeTunnel) return url;
  const path = url.replace(/^https?:\/\/[^/]+/, '') || '/video_feed';
  return `${activeTunnel}${path}`;
};
  const centerCoords: [number, number] = useMemo(() => {
    if (selectedVenue?.centerCoords) return selectedVenue.centerCoords;
    const isKalingaSelected = selectedVenue?.id?.includes('kalinga') || selectedVenue?.name?.includes('Kalinga');
    return isKalingaSelected ? [20.2880, 85.8238] : [20.2494, 85.8000];
  }, [selectedVenue]);
  const filteredCctvFeeds = useMemo(() => {
    const isKalingaSelected = selectedVenue?.id?.includes('kalinga') || selectedVenue?.name?.includes('Kalinga');
    return cctvFeeds.filter((feed) => {
      const isKalingaFeed = (feed.zoneId || '').toLowerCase().startsWith('ks_') || feed.id.startsWith('ks_');
      if (isKalingaSelected) return isKalingaFeed;
      return !isKalingaFeed;
    });
  }, [cctvFeeds, selectedVenue]);
  const cleanZones = useMemo(() => {
    return zones.filter((z) => {
      if (isLegacyPhantomZone(z.id)) return false;
      const venueId = (z as any).venue_id || (z as any).venueId;
      if (selectedVenue?.id && venueId) {
        return venueId === selectedVenue.id;
      }
      const isKalingaSelected = selectedVenue?.id?.includes('kalinga') || selectedVenue?.name?.includes('Kalinga');
      if (isKalingaSelected) return z.id.startsWith('ks_');
      return !z.id.startsWith('ks_');
    });
  }, [zones, selectedVenue]);
  const activeEvacuationRoute = useMemo(() => {
    for (const zone of cleanZones) {
      const route = (zone as any).evacuationRoute;
      if (route?.status === 'SUCCESS' && Array.isArray(route.path_coords) && route.path_coords.length > 1) {
        return route as { path_coords: [number, number][]; message?: string };
      }
    }
    return null;
  }, [cleanZones]);
  const showToastError = (msg: string) => {
    setLocalToast(msg);
    setTimeout(() => setLocalToast(null), 3500);
  };
  const handleImageError = (feedId: string) => {
    setFailedFeeds((prev) => ({ ...prev, [feedId]: true }));
  };
  const handleRetryFeed = (feedId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setStreamCacheBusters((prev) => ({ ...prev, [feedId]: Date.now() }));
    setFailedFeeds((prev) => ({ ...prev, [feedId]: false }));
  };
  const getPortFromUrl = (url: string, defaultPort: string = '5000') => {
    const match = url.match(/:(\d+)\//);
    return match ? match[1] : defaultPort;
  };
  const findMatchedZone = (feed: CCTVFeed): VenueZone | null => {
    if (!cleanZones || cleanZones.length === 0) return null;
    const camNum = feed.id.replace(/\D/g, '');
    return cleanZones.find((z) => {
      const zid = (z.id || '').toLowerCase();
      const zcode = (z.code || '').toLowerCase();
      const targetId = (feed.zoneId || '').toLowerCase();
      if (targetId && (zid === targetId || zcode === targetId)) return true;
      if (camNum) {
        const num = parseInt(camNum, 10);
        if (zid.includes(`z-${num}`) || zid.includes(`z-0${num}`) || zcode.includes(`z-${num}`) || zcode.includes(`z-0${num}`)) return true;
      }
      return false;
    }) || null;
  };
  const createZoneMarkerIcon = (code: string, density: number, riskLevel: string) => {
    let colorClass = 'bg-[#22D3A6] text-white border-white/20';
    if (riskLevel === 'critical') colorClass = 'bg-[#FF3B5C] text-white animate-pulse border-white/50 shadow-[0_0_15px_rgba(255,59,92,0.6)]';
    else if (riskLevel === 'warning') colorClass = 'bg-[#FF7A45] text-white border-white/30';
    else if (riskLevel === 'caution') colorClass = 'bg-[#FFB627] text-slate-900 border-white/30';
    return L.divIcon({
      className: 'custom-leaflet-marker bg-transparent border-0',
      html: `
        <div class="px-2.5 py-1 rounded-lg font-mono font-black text-xs shadow-xl border flex items-center gap-1.5 transition-all ${colorClass}">
          <span>${code}</span>
          <span class="text-[10px] bg-black/20 backdrop-blur-sm px-1.5 py-0.5 rounded-md tracking-wider">${Number(density || 0).toFixed(1)}</span>
        </div>
      `,
      iconSize: [85, 30],
      iconAnchor: [42, 15],
    });
  };

  return (
    <div className="flex flex-col h-full w-full relative font-body select-none bg-slate-50">
      
      {/* ── MAP HEADER ── */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between z-10 shadow-sm gap-2 sm:gap-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-[#67b2b9] to-[#648d6a] text-white shadow-inner shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <h2 className="font-heading font-black text-sm sm:text-base text-slate-900 tracking-tight">
              Spatial Telemetry & Heatmap
            </h2>
            <span className="text-[10px] sm:text-xs text-slate-500 font-medium">
              {selectedVenue ? selectedVenue.name : 'Awaiting Edge Telemetry...'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs font-mono font-bold tracking-wider uppercase bg-slate-100/50 px-3 py-1.5 rounded-xl border border-slate-200/50">
          <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-[#22D3A6] shadow-sm" /> Safe</span>
          <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-[#FFB627] shadow-sm" /> Caut</span>
          <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-[#FF7A45] shadow-sm" /> Warn</span>
          <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-[#FF3B5C] shadow-sm animate-pulse" /> Crit</span>
        </div>
      </div>

      {/* ── MAP AREA ── */}
      <div className="flex-1 w-full min-h-0 relative z-0">
        {localToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] bg-[#FF3B5C] text-white px-5 py-2.5 rounded-xl shadow-xl font-body text-sm font-bold animate-fadeIn tracking-wide">
            {localToast}
          </div>
        )}
        
        {cleanZones.length === 0 && (
          <div className="absolute inset-0 z-[450] bg-white/40 backdrop-blur-md flex items-center justify-center pointer-events-none">
            <div className="bg-white shadow-2xl rounded-2xl px-6 py-4 flex items-center gap-4 border border-slate-200/80">
              <span className="w-5 h-5 rounded-full border-2 border-[#67b2b9] border-t-transparent animate-spin" />
              <span className="text-sm font-bold text-slate-800 tracking-wide">Loading zone telemetry…</span>
            </div>
          </div>
        )}

        <MapContainer center={centerCoords} zoom={17} scrollWheelZoom={true} className="w-full h-full z-0">
          <MapUpdater center={centerCoords} resizeTrigger={isCctvExpanded} />
          <LocateMeControl onLocate={setUserLocation} onError={showToastError} />

          {userLocation && (
            <Marker
              position={userLocation}
              icon={L.divIcon({
                className: 'custom-user-marker bg-transparent border-0',
                html: `<div class="w-4 h-4 bg-[#67b2b9] border-2 border-white rounded-full shadow-[0_0_15px_rgba(103,178,185,0.9)] animate-pulse"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8],
              })}
            >
              <Popup>
                <div className="text-xs font-black text-center font-heading text-slate-800">You Are Here</div>
              </Popup>
            </Marker>
          )}

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {cleanZones.map((zone) => {
            const polygonColor = getRiskColor(zone.riskLevel);
            const lat = Number(zone.center?.[0] ?? (zone as any).center_lat ?? (zone as any).centerLat ?? 0);
            const lng = Number(zone.center?.[1] ?? (zone as any).center_lng ?? (zone as any).centerLng ?? 0);
            const center: [number, number] = [lat, lng];
            const existingPoly = zone.polygon || (zone as any).coordinates_json || (zone as any).coordinatesJson;
            const tightPolygon = getTightPolygon(center, existingPoly);

            return (
              <React.Fragment key={zone.id}>
                <Polygon
                  positions={tightPolygon}
                  pathOptions={{
                    color: polygonColor,
                    fillColor: polygonColor,
                    fillOpacity: 0.25,
                    weight: 2,
                    dashArray: '5, 5'
                  }}
                >
                  <Popup className="premium-popup">
                    <div className="p-1 font-body flex flex-col gap-1.5 min-w-[180px]">
                      <span className="font-heading font-black text-sm text-slate-900 border-b border-slate-100 pb-1">
                        {zone.name} <span className="text-slate-400 font-mono text-xs">({zone.code})</span>
                      </span>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Headcount</span>
                          <span className="text-xs text-slate-900 font-mono font-bold">{(zone.currentHeadcount ?? 0).toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Density</span>
                          <span className="text-xs text-slate-900 font-mono font-bold">{Number(zone.density || 0).toFixed(1)} <span className="text-[9px]">p/m²</span></span>
                        </div>
                      </div>
                      <span className="font-mono font-black uppercase text-[10px] mt-1.5 px-2 py-1 rounded w-full text-center text-white tracking-widest shadow-sm" style={{ backgroundColor: polygonColor }}>
                        STATUS: {zone.riskLevel}
                      </span>
                    </div>
                  </Popup>
                  <Tooltip sticky>
                    <div className="p-0.5 font-body flex flex-col gap-0.5">
                      <span className="font-black font-heading text-xs text-slate-800">{zone.name}</span>
                      <span className="font-mono text-[10px] font-bold text-slate-600">Density: {Number(zone.density || 0).toFixed(2)} p/m²</span>
                    </div>
                  </Tooltip>
                </Polygon>

                <Marker position={center} icon={createZoneMarkerIcon(zone.code, zone.density, zone.riskLevel)}>
                  <Popup className="premium-popup">
                    <div className="p-1 font-body flex flex-col gap-1.5 min-w-[180px]">
                      <span className="font-heading font-black text-sm text-slate-900 border-b border-slate-100 pb-1">
                        {zone.name} <span className="text-slate-400 font-mono text-xs">({zone.code})</span>
                      </span>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Headcount</span>
                          <span className="text-xs text-slate-900 font-mono font-bold">{(zone.currentHeadcount ?? 0).toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Density</span>
                          <span className="text-xs text-slate-900 font-mono font-bold">{Number(zone.density || 0).toFixed(1)} <span className="text-[9px]">p/m²</span></span>
                        </div>
                      </div>
                      <span className="font-mono font-black uppercase text-[10px] mt-1.5 px-2 py-1 rounded w-full text-center text-white tracking-widest shadow-sm" style={{ backgroundColor: polygonColor }}>
                        STATUS: {zone.riskLevel}
                      </span>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}

          {activeEvacuationRoute && (
            <Polyline
              positions={activeEvacuationRoute.path_coords}
              pathOptions={{ color: '#67b2b9', weight: 6, dashArray: '10, 10', opacity: 0.9 }}
            >
              <Popup>
                <div className="p-1 text-xs font-heading font-bold text-[#67b2b9]">
                  ✓ Safe Evacuation Route{activeEvacuationRoute.message ? ` — ${activeEvacuationRoute.message}` : ''}
                </div>
              </Popup>
            </Polyline>
          )}
        </MapContainer>
        {/* ── SECTOR LIVE STATUS ── */}
        <div className="absolute top-4 left-4 z-[400] bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 shadow-2xl max-w-[calc(100vw-2rem)] sm:max-w-xs w-full flex flex-col font-body max-h-[35vh] sm:max-h-[50vh]">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 mb-3 shrink-0">
            <span className="font-heading font-black text-xs text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#67b2b9]" /> Sector Status
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-[#22D3A6] shadow-[0_0_8px_rgba(34,211,166,0.8)] animate-pulse" />
          </div>
          <div className="flex flex-col gap-2.5 overflow-y-auto pr-1 smooth-scroll">
            {cleanZones.length > 0 ? (
              cleanZones.map((z) => {
                const zColor = getRiskColor(z.riskLevel);
                return (
                  <div
                    key={z.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                      z.riskLevel === 'critical' ? 'bg-[#FF3B5C]/5 border-[#FF3B5C]/30 hover:bg-[#FF3B5C]/10' :
                      z.riskLevel === 'warning' ? 'bg-[#FF7A45]/5 border-[#FF7A45]/30 hover:bg-[#FF7A45]/10' :
                      z.riskLevel === 'caution' ? 'bg-[#FFB627]/5 border-[#FFB627]/30 hover:bg-[#FFB627]/10' :
                      'bg-[#22D3A6]/5 border-[#22D3A6]/30 hover:bg-[#22D3A6]/10'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {z.riskLevel === 'critical' || z.riskLevel === 'warning' ? (
                        <AlertTriangle className="w-4 h-4 text-[#FF3B5C] shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-[#22D3A6] shrink-0" />
                      )}
                      <span className="font-bold text-slate-800 text-xs truncate max-w-[100px] sm:max-w-[120px]">{z.name}</span>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="font-mono font-black text-[10px]" style={{ color: zColor }}>
                        {Number(z.density || 0).toFixed(1)} <span className="text-[8px]">p/m²</span>
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#22D3A6]/10 border border-[#22D3A6]/30">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#22D3A6]" />
                  <span className="font-bold text-slate-800 text-sm">All Sectors</span>
                </div>
                <span className="font-mono font-black text-[#22D3A6] tracking-wider text-xs">SECURE</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── CCTV BOTTOM PANEL── */}
      <div className={`bg-slate-900 text-white z-[400] flex flex-col transition-all duration-300 ease-in-out shadow-[0_-10px_30px_rgba(0,0,0,0.15)] ${isCctvExpanded ? 'p-4 sm:p-5 gap-4' : 'p-0'}`}>
        
        {/* Toggle Bar */}
        <div 
          className={`flex items-center justify-between px-4 sm:px-6 py-3 cursor-pointer select-none transition-colors ${
            !isCctvExpanded ? 'bg-gradient-to-r from-[#67b2b9] to-[#648d6a] hover:opacity-95' : 'bg-slate-800/50 hover:bg-slate-800 rounded-xl'
          }`}
          onClick={onToggleCctvExpanded}
        >
          <span className="font-heading font-black text-sm flex items-center gap-3 tracking-wide">
            <span className="p-1 rounded-lg bg-black/20 text-white shadow-inner flex items-center justify-center">
              {isCctvExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </span>
            <Video className="w-4 h-4 text-white" />
            LIVE EDGE CCTV
            <span className="hidden sm:inline bg-white/20 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest ml-2 border border-white/20">
              MULTI-PORT MJPEG
            </span>
          </span>
          <div className="flex items-center gap-3">
            <span className="text-white/80 font-mono font-bold text-[10px] sm:text-xs tracking-widest uppercase">
              {filteredCctvFeeds.filter((f) => !failedFeeds[f.id]).length} / {filteredCctvFeeds.length} Active
            </span>
          </div>
        </div>

        {isCctvExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fadeIn">
            {filteredCctvFeeds.map((feed) => {
              const port = getPortFromUrl(feed.imageUrl);
              const matchedZone = findMatchedZone(feed);
              const isOffline = failedFeeds[feed.id];
              const cacheBuster = streamCacheBusters[feed.id];              
              const rawUrl = resolveStreamUrl(feed.imageUrl, feed.id);
              const streamUrl = cacheBuster ? `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}t=${cacheBuster}` : rawUrl; 
              const headcount = matchedZone ? matchedZone.currentHeadcount : (feed.personCount || 0);
              const density = matchedZone ? matchedZone.density : 0;
              return (
                <div
                  key={feed.id}
                  onClick={() => setActiveCameraModal(feed)}
                  className="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 cursor-pointer group aspect-video shadow-xl"
                >
                  {isOffline ? (
                    <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center gap-2 text-slate-300 p-4 text-center">
                      <VideoOff className="w-6 h-6 text-[#FF3B5C] animate-pulse" />
                      <span className="font-heading font-bold text-xs tracking-wide">Signal Lost</span>
                      <span className="px-2 py-1 rounded-md bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 text-[#FF3B5C] font-mono font-bold text-[10px] tracking-widest">
                        PORT {port}
                      </span>
                      <button
                        onClick={(e) => handleRetryFeed(feed.id, e)}
                        className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[10px] font-bold text-white flex items-center gap-1.5 transition-all active:scale-95"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry
                      </button>
                    </div>
                  ) : (
                    <img
                      src={streamUrl}
                      alt={feed.name}
                      onError={() => handleImageError(feed.id)}
                      className="w-full h-full object-cover group-hover:scale-105 group-hover:opacity-80 transition-all duration-500"
                    />
                  )}
                  {!isOffline && (
                    <div className="absolute inset-0 pointer-events-none p-1">
                      {feed.yoloDetections?.map((det) => (
                        <div
                          key={det.id}
                          style={{
                            left: `${det.bbox.x}%`, top: `${det.bbox.y}%`, width: `${det.bbox.width}%`, height: `${det.bbox.height}%`,
                          }}
                          className={`absolute border-2 rounded-sm shadow-sm ${det.type === 'backlog' ? 'border-[#FF3B5C] bg-[#FF3B5C]/20' : 'border-[#22D3A6] bg-[#22D3A6]/10'}`}
                        >
                          <span className="absolute -top-4 left-[-2px] bg-black/80 backdrop-blur-sm text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-sm text-white whitespace-nowrap tracking-wider">
                            {det.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Glassmorphic Overlays */}
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-white flex items-center gap-1.5 border border-white/10 shadow-sm">
                    <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-[#FF3B5C]' : 'bg-[#22D3A6] animate-pulse'}`} />
                    <span className="truncate max-w-[120px] uppercase tracking-wider">{feed.name}</span>
                  </div>

                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold text-white border border-white/10 shadow-sm tracking-wider">
                    {isOffline ? 'NO FEED' : `${headcount} PAX ${matchedZone ? `· ${density.toFixed(1)} P/M²` : ''}`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {activeCameraModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 sm:p-8 font-body animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-5xl w-full overflow-hidden flex flex-col text-white shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex flex-col gap-1">
                <h3 className="font-heading font-black text-xl text-white tracking-wide">
                  {activeCameraModal.name}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono flex items-center gap-2 tracking-widest uppercase">
                  <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-300 font-bold">PORT {getPortFromUrl(activeCameraModal.imageUrl)}</span>
                  <span>·</span>
                  <span>{activeCameraModal.location}</span>
                </p>
              </div>
              <button
                onClick={() => setActiveCameraModal(null)}
                className="p-2.5 rounded-full bg-slate-800 hover:bg-rose-500/20 border border-slate-700 hover:border-rose-500/50 text-slate-400 hover:text-rose-400 transition-all cursor-pointer active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative aspect-video bg-black w-full overflow-hidden">
              {failedFeeds[activeCameraModal.id] ? (
                <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center gap-3 text-slate-400 p-6 text-center">
                  <VideoOff className="w-12 h-12 text-[#FF3B5C] animate-pulse" />
                  <span className="font-heading font-bold text-lg text-slate-200">Signal Lost</span>
                  <button
                    onClick={() => handleRetryFeed(activeCameraModal.id)}
                    className="mt-3 px-5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <RefreshCw className="w-4 h-4" /> Retry Connection
                  </button>
                </div>
              ) : (
                <img
                  src={(() => {
                    const rawModalUrl = resolveStreamUrl(activeCameraModal.imageUrl, activeCameraModal.id);
                    const buster = streamCacheBusters[activeCameraModal.id];
                    return buster ? `${rawModalUrl}${rawModalUrl.includes('?') ? '&' : '?'}t=${buster}` : rawModalUrl;
                  })()}
                  alt={activeCameraModal.name}
                  onError={() => handleImageError(activeCameraModal.id)}
                  className="w-full h-full object-contain"
                />
              )}
              {!failedFeeds[activeCameraModal.id] && (
                <div className="absolute inset-0 p-4 pointer-events-none">
                  {activeCameraModal.yoloDetections?.map((det) => (
                    <div
                      key={det.id}
                      style={{
                        left: `${det.bbox.x}%`, top: `${det.bbox.y}%`, width: `${det.bbox.width}%`, height: `${det.bbox.height}%`,
                      }}
                      className={`absolute border-2 rounded ${det.type === 'backlog' ? 'border-[#FF3B5C] bg-[#FF3B5C]/20 shadow-[0_0_15px_rgba(255,59,92,0.4)]' : 'border-[#22D3A6] bg-[#22D3A6]/10'}`}
                    >
                      <span className="absolute -top-6 left-[-2px] bg-black/80 backdrop-blur-md text-[10px] font-mono font-bold px-2 py-1 rounded text-white whitespace-nowrap tracking-wider shadow-sm">
                        {det.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-mono text-slate-400 bg-slate-950 border-t border-slate-800">
              <span className="uppercase tracking-widest font-bold">YOLO11 Edge Stream</span>
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-[#22D3A6] animate-pulse" />
                {findMatchedZone(activeCameraModal)?.currentHeadcount ?? 0} PAX · {findMatchedZone(activeCameraModal)?.density.toFixed(1) ?? '--'} P/M²
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};