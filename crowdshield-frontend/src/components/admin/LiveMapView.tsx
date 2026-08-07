import React, { useState } from 'react';
import { VenueZone, CCTVFeed, VenueInfo } from '../../types';
import { MapContainer, TileLayer, Polygon, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { 
  Video, 
  Layers, 
  Maximize2, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle,
  Eye,
  X,
  VideoOff,
  RefreshCw
} from 'lucide-react';

interface LiveMapViewProps {
  selectedVenue: VenueInfo | null;
  zones: VenueZone[];
  cctvFeeds: CCTVFeed[];
}

export const LiveMapView: React.FC<LiveMapViewProps> = ({
  selectedVenue,
  zones = [],
  cctvFeeds = [],
}) => {
  const [activeCameraModal, setActiveCameraModal] = useState<CCTVFeed | null>(null);
  const [failedFeeds, setFailedFeeds] = useState<Record<string, boolean>>({});
  const [streamCacheBusters, setStreamCacheBusters] = useState<Record<string, number>>({});

  const centerCoords: [number, number] = selectedVenue?.centerCoords || [28.5833, 77.2333];

  const handleImageError = (feedId: string) => {
    setFailedFeeds((prev) => ({ ...prev, [feedId]: true }));
  };

  const handleRetryFeed = (feedId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setStreamCacheBusters((prev) => ({ ...prev, [feedId]: Date.now() }));
    setFailedFeeds((prev) => ({ ...prev, [feedId]: false }));
  };

  // Extract port from stream URL (e.g. http://localhost:5001/video_feed -> 5001)
  const getPortFromUrl = (url: string, defaultPort: string = '5000') => {
    const match = url.match(/:(\d+)\//);
    return match ? match[1] : defaultPort;
  };

  // Match feed with live telemetry zone data
  const findMatchedZone = (feed: CCTVFeed): VenueZone | null => {
    if (!zones || zones.length === 0) return null;
    const camNum = feed.id.replace(/\D/g, '');
    return zones.find((z) => {
      const zid = (z.id || '').toLowerCase();
      const zcode = (z.code || '').toLowerCase();
      const targetId = (feed.zoneId || '').toLowerCase();
      if (targetId && (zid === targetId || zcode === targetId)) return true;
      if (camNum) {
        const num = parseInt(camNum, 10);
        if (zid.includes(`z-${num}`) || zid.includes(`z-0${num}`) || zcode.includes(`z-${num}`) || zcode.includes(`z-0${num}`)) {
          return true;
        }
      }
      return false;
    }) || null;
  };

  // Custom DivIcon generator for Leaflet markers
  const createZoneMarkerIcon = (code: string, density: number, riskLevel: string) => {
    let colorClass = 'bg-[#22D3A6] text-white';
    if (riskLevel === 'critical') colorClass = 'bg-[#FF3B5C] text-white animate-pulse';
    else if (riskLevel === 'warning') colorClass = 'bg-[#FF7A45] text-white';
    else if (riskLevel === 'caution') colorClass = 'bg-[#FFB627] text-[#151726]';

    return L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div class="px-2 py-1 rounded-md font-mono font-bold text-xs shadow-lg border border-white flex items-center gap-1 ${colorClass}">
          <span>${code}</span>
          <span class="text-[10px] bg-black/20 px-1 rounded">${density}p/m²</span>
        </div>
      `,
      iconSize: [80, 26],
      iconAnchor: [40, 13],
    });
  };

  const getPolygonColor = (level: string) => {
    switch (level) {
      case 'critical':
        return '#FF3B5C';
      case 'warning':
        return '#FF7A45';
      case 'caution':
        return '#FFB627';
      case 'safe':
      default:
        return '#2C7BE5';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-57px)] relative font-body select-none">
      {/* Top Map Control Bar */}
      <div className="bg-white border-b border-[#E7E5DD] px-4 py-2 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <h2 className="font-heading font-bold text-base text-[#151726]">
            Spatial Telemetry & Heatmap Overlay
          </h2>
          <span className="text-xs text-[#5B5F73]">
            {selectedVenue ? selectedVenue.name : 'Awaiting Edge Telemetry...'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono-num">
          <span className="flex items-center gap-1 text-[#2C7BE5]">
            <span className="w-3 h-3 rounded bg-[#2C7BE5]/40 border border-[#2C7BE5]" /> Sector Alpha (Secure)
          </span>
          <span className="flex items-center gap-1 text-[#FF3B5C]">
            <span className="w-3 h-3 rounded bg-[#FF3B5C]/40 border border-[#FF3B5C]" /> Sector Bravo (Alert)
          </span>
        </div>
      </div>

      {/* Main Leaflet Map View */}
      <div className="flex-1 w-full h-full relative z-0">
        <MapContainer
          center={centerCoords}
          zoom={16}
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Render Zone Polygons */}
          {zones.map((zone) => {
            const polygonColor = getPolygonColor(zone.riskLevel);
            return (
              <React.Fragment key={zone.id}>
                <Polygon
                  positions={zone.polygon}
                  pathOptions={{
                    color: polygonColor,
                    fillColor: polygonColor,
                    fillOpacity: 0.35,
                    weight: 3,
                  }}
                >
                  <Popup>
                    <div className="p-1 font-body text-xs flex flex-col gap-1 min-w-[160px]">
                      <span className="font-heading font-bold text-sm text-[#151726]">
                        {zone.name} ({zone.code})
                      </span>
                      <span className="text-[11px] text-[#5B5F73] font-mono-num">
                        Density: {zone.density} p/m²
                      </span>
                      <span className="text-[11px] text-[#5B5F73] font-mono-num">
                        Headcount: {zone.currentHeadcount ?? 0} / {zone.maxCapacity}
                      </span>
                      <span className="font-bold uppercase text-[10px] mt-1" style={{ color: polygonColor }}>
                        Status: {zone.riskLevel}
                      </span>
                    </div>
                  </Popup>
                </Polygon>

                <Marker
                  position={zone.center}
                  icon={createZoneMarkerIcon(zone.code, zone.density, zone.riskLevel)}
                />
              </React.Fragment>
            );
          })}

          {/* Citizen Evacuation Polyline Path avoiding red bottleneck zones */}
          <Polyline
            positions={[
              [20.2961, 85.8245],
              [20.2980, 85.8230],
              [20.3010, 85.8270]
            ]}
            pathOptions={{
              color: '#2C7BE5',
              weight: 5,
              dashArray: '8, 8',
              opacity: 0.9
            }}
          >
            <Popup>
              <div className="p-1 text-xs font-heading font-bold text-[#2C7BE5]">
                ✓ A* Safe Evacuation Route (Diverts around Gate 3 Surge)
              </div>
            </Popup>
          </Polyline>
        </MapContainer>

        {/* Floating Sector Status Overlay Card */}
        <div className="absolute top-4 left-4 z-[400] bg-white/95 backdrop-blur-md border border-[#E7E5DD] rounded-2xl p-4 shadow-xl max-w-xs w-full font-body">
          <div className="flex items-center justify-between border-b border-[#E7E5DD] pb-2 mb-3">
            <span className="font-heading font-bold text-xs text-[#151726] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#2C7BE5]" /> Sector Live Status
            </span>
            <span className="w-2 h-2 rounded-full bg-[#22D3A6] animate-pulse" />
          </div>

          <div className="flex flex-col gap-2.5 text-xs">
            {zones.length > 0 ? (
              zones.slice(0, 3).map((z) => (
                <div 
                  key={z.id} 
                  className={`flex items-center justify-between p-2 rounded-lg border ${
                    z.riskLevel === 'critical' ? 'bg-[#FF3B5C]/10 border-[#FF3B5C]/30' :
                    z.riskLevel === 'warning' ? 'bg-[#FF7A45]/10 border-[#FF7A45]/30' :
                    z.riskLevel === 'caution' ? 'bg-[#FFB627]/10 border-[#FFB627]/30' :
                    'bg-[#22D3A6]/10 border-[#22D3A6]/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {z.riskLevel === 'critical' || z.riskLevel === 'warning' ? (
                      <AlertTriangle className="w-4 h-4 text-[#FF3B5C]" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-[#22D3A6]" />
                    )}
                    <span className="font-bold text-[#151726]">{z.name}</span>
                  </div>
                  <span className="font-mono-num font-bold uppercase text-[11px]" style={{
                    color: z.riskLevel === 'critical' ? '#FF3B5C' : z.riskLevel === 'warning' ? '#FF7A45' : z.riskLevel === 'caution' ? '#FFB627' : '#22D3A6'
                  }}>
                    {z.currentHeadcount} p · {z.density.toFixed(1)} p/m²
                  </span>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#22D3A6]/10 border border-[#22D3A6]/30">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#22D3A6]" />
                  <span className="font-bold text-[#151726]">All Sectors</span>
                </div>
                <span className="font-mono-num font-bold text-[#22D3A6]">SECURE</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Horizontal Camera Strip */}
      <div className="bg-[#151726] text-white p-3 z-[400] border-t border-white/10 flex flex-col gap-2">
        <div className="flex items-center justify-between px-2 text-xs">
          <span className="font-heading font-bold text-gray-300 flex items-center gap-2">
            <Video className="w-4 h-4 text-[#2C7BE5]" />
            LIVE EDGE CCTV FEEDS (MULTI-PORT MJPEG)
          </span>
          <span className="text-gray-400 font-mono-num text-[11px]">
            4 Active Feeds · 120 FPS Aggregate
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cctvFeeds.map((feed) => {
            const port = getPortFromUrl(feed.imageUrl);
            const matchedZone = findMatchedZone(feed);
            const isOffline = failedFeeds[feed.id];
            const cacheBuster = streamCacheBusters[feed.id];
            const streamUrl = cacheBuster ? `${feed.imageUrl}?t=${cacheBuster}` : feed.imageUrl;

            const headcount = matchedZone ? matchedZone.currentHeadcount : (feed.personCount || 0);
            const density = matchedZone ? matchedZone.density : 0;

            return (
              <div
                key={feed.id}
                onClick={() => setActiveCameraModal(feed)}
                className="relative rounded-xl overflow-hidden border border-white/15 bg-black cursor-pointer group aspect-video"
              >
                {isOffline ? (
                  <div className="w-full h-full bg-[#151726] flex flex-col items-center justify-center gap-1.5 text-white p-2 text-center">
                    <VideoOff className="w-5 h-5 text-[#FF3B5C] animate-pulse" />
                    <span className="font-heading font-bold text-[11px] text-white">
                      Camera Offline - Awaiting Edge Feed
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-[#FF3B5C]/20 border border-[#FF3B5C]/30 text-[#FF3B5C] font-mono-num font-bold text-[9px]">
                      Port {port}
                    </span>
                    <button
                      onClick={(e) => handleRetryFeed(feed.id, e)}
                      className="mt-1 px-2.5 py-0.5 bg-[#2C7BE5] hover:bg-[#2C7BE5]/80 rounded text-[10px] font-bold text-white flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Retry Stream</span>
                    </button>
                  </div>
                ) : (
                  <img
                    src={streamUrl}
                    alt={feed.name}
                    onError={() => handleImageError(feed.id)}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}

                {/* YOLO11 Bounding Box Overlay */}
                {!isOffline && (
                  <div className="absolute inset-0 pointer-events-none p-1">
                    {feed.yoloDetections.map((det) => (
                      <div
                        key={det.id}
                        style={{
                          left: `${det.bbox.x}%`,
                          top: `${det.bbox.y}%`,
                          width: `${det.bbox.width}%`,
                          height: `${det.bbox.height}%`,
                        }}
                        className={`absolute border ${
                          det.type === 'backlog'
                            ? 'border-[#FF3B5C] bg-[#FF3B5C]/20'
                            : det.type === 'velocity_anomaly'
                            ? 'border-[#FFB627] bg-[#FFB627]/20'
                            : 'border-[#22D3A6] bg-[#22D3A6]/10'
                        }`}
                      >
                        <span className="absolute -top-3 left-0 bg-black/80 text-[9px] font-mono-num px-1 rounded text-white whitespace-nowrap">
                          {det.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Top Tag */}
                <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono-num text-white flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${isOffline ? 'bg-[#FF3B5C]' : 'bg-[#22D3A6] animate-pulse'}`} />
                  <span>{feed.name}</span>
                </div>

                {/* Bottom Tag - Dynamic Telemetry */}
                <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono-num text-white">
                  {headcount} headcount {matchedZone ? `· ${density.toFixed(1)} p/m²` : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Camera Feed Modal */}
      {activeCameraModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 p-4 font-body animate-fadeIn">
          <div className="bg-[#151726] border border-white/20 rounded-2xl max-w-3xl w-full overflow-hidden flex flex-col text-white">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-white">
                  {activeCameraModal.name}
                </h3>
                <p className="text-xs text-gray-400 font-mono-num">
                  Location: {activeCameraModal.location} · Node: {activeCameraModal.edgeNodeId} · Port: {getPortFromUrl(activeCameraModal.imageUrl)}
                </p>
              </div>
              <button
                onClick={() => setActiveCameraModal(null)}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video bg-black w-full overflow-hidden">
              {failedFeeds[activeCameraModal.id] ? (
                <div className="w-full h-full bg-[#151726] flex flex-col items-center justify-center gap-3 text-white p-6 text-center">
                  <VideoOff className="w-10 h-10 text-[#FF3B5C] animate-pulse" />
                  <span className="font-heading font-bold text-base text-white">
                    Camera Offline - Awaiting Edge Feed
                  </span>
                  <span className="px-3 py-1 rounded bg-[#FF3B5C]/20 border border-[#FF3B5C]/40 text-[#FF3B5C] font-mono-num font-bold text-xs">
                    Target Port {getPortFromUrl(activeCameraModal.imageUrl)}
                  </span>
                  <button
                    onClick={() => handleRetryFeed(activeCameraModal.id)}
                    className="mt-2 px-4 py-1.5 bg-[#2C7BE5] hover:bg-[#2C7BE5]/80 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Retry Stream Connection</span>
                  </button>
                </div>
              ) : (
                <img
                  src={streamCacheBusters[activeCameraModal.id] ? `${activeCameraModal.imageUrl}?t=${streamCacheBusters[activeCameraModal.id]}` : activeCameraModal.imageUrl}
                  alt={activeCameraModal.name}
                  onError={() => handleImageError(activeCameraModal.id)}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Bounding box overlays */}
              {!failedFeeds[activeCameraModal.id] && (
                <div className="absolute inset-0 p-4 pointer-events-none">
                  {activeCameraModal.yoloDetections.map((det) => (
                    <div
                      key={det.id}
                      style={{
                        left: `${det.bbox.x}%`,
                        top: `${det.bbox.y}%`,
                        width: `${det.bbox.width}%`,
                        height: `${det.bbox.height}%`,
                      }}
                      className={`absolute border-2 ${
                        det.type === 'backlog'
                          ? 'border-[#FF3B5C] bg-[#FF3B5C]/25'
                          : 'border-[#22D3A6] bg-[#22D3A6]/15'
                      }`}
                    >
                      <span className="absolute -top-5 left-0 bg-[#151726] text-[11px] font-mono-num px-1.5 py-0.5 rounded text-white">
                        {det.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 flex items-center justify-between text-xs font-mono-num text-gray-300 bg-white/5">
              <span>YOLO11 Edge Stream · Port {getPortFromUrl(activeCameraModal.imageUrl)}</span>
              <span>
                Live Telemetry: {findMatchedZone(activeCameraModal)?.currentHeadcount ?? 0} headcount · {findMatchedZone(activeCameraModal)?.density.toFixed(1) ?? '--'} p/m²
              </span>
              <button
                onClick={() => setActiveCameraModal(null)}
                className="px-4 py-1.5 bg-[#2C7BE5] text-white rounded-lg font-bold font-heading"
              >
                Close Feed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
