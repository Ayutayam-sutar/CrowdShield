import React, { useState } from 'react';
import { VenueZone, CCTVFeed, VenueInfo } from '../../types';
import { MapContainer, TileLayer, Polygon, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  Video, 
  Layers, 
  Maximize2, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle,
  Eye,
  X
} from 'lucide-react';

interface LiveMapViewProps {
  selectedVenue: VenueInfo;
  zones: VenueZone[];
  cctvFeeds: CCTVFeed[];
}

export const LiveMapView: React.FC<LiveMapViewProps> = ({
  selectedVenue,
  zones,
  cctvFeeds,
}) => {
  const [activeCameraModal, setActiveCameraModal] = useState<CCTVFeed | null>(null);

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
            {selectedVenue.name}
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
          center={selectedVenue.centerCoords}
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
              [20.2961, 85.8245], // User Blue Dot / Gate 3
              [20.2980, 85.8230], // Curved waypoint around red zone
              [20.3010, 85.8270]  // Safe Exit Gate 4
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
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#22D3A6]/10 border border-[#22D3A6]/30">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#22D3A6]" />
                <span className="font-bold text-[#151726]">Sector Alpha</span>
              </div>
              <span className="font-mono-num font-bold text-[#22D3A6]">SECURE · 1.8 p/m²</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-[#FF3B5C]/10 border border-[#FF3B5C]/30">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#FF3B5C]" />
                <span className="font-bold text-[#151726]">Sector Bravo</span>
              </div>
              <span className="font-mono-num font-bold text-[#FF3B5C]">CRITICAL · 4.8 p/m²</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Horizontal Camera Strip */}
      <div className="bg-[#151726] text-white p-3 z-[400] border-t border-white/10 flex flex-col gap-2">
        <div className="flex items-center justify-between px-2 text-xs">
          <span className="font-heading font-bold text-gray-300 flex items-center gap-2">
            <Video className="w-4 h-4 text-[#2C7BE5]" />
            LIVE EDGE CCTV FEEDS (YOLO11 COMPLIANT)
          </span>
          <span className="text-gray-400 font-mono-num text-[11px]">
            4 Active Feeds · 120 FPS Aggregate
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {cctvFeeds.map((feed) => (
            <div
              key={feed.id}
              onClick={() => setActiveCameraModal(feed)}
              className="relative rounded-xl overflow-hidden border border-white/15 bg-black cursor-pointer group aspect-video"
            >
              <img
                src={feed.imageUrl}
                alt={feed.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />

              {/* YOLO11 Bounding Box Overlay Simulation */}
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

              {/* Top Tag */}
              <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono-num text-white flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22D3A6] animate-pulse" />
                <span>{feed.name}</span>
              </div>

              {/* Bottom Tag */}
              <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono-num text-white">
                {feed.personCount} count
              </div>
            </div>
          ))}
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
                  Location: {activeCameraModal.location} · Node: {activeCameraModal.edgeNodeId}
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
              <img
                src={activeCameraModal.imageUrl}
                alt={activeCameraModal.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />

              {/* Bounding box overlays */}
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
            </div>

            <div className="p-4 flex items-center justify-between text-xs font-mono-num text-gray-300 bg-white/5">
              <span>YOLO11 Edge Inference: 30 FPS</span>
              <span>Headcount: {activeCameraModal.personCount} individuals</span>
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
