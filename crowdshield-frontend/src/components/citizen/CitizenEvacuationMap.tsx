import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Tooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Footprints, Clock, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';
import api from '../../utils/api';
import { VenueZone } from '../../types';

// Utility to force Leaflet to redraw when expanding to full screen
const MapUpdater: React.FC<{ center: [number, number]; resizeTrigger?: boolean }> = ({ center, resizeTrigger }) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);

  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map, resizeTrigger]);

  return null;
};

const getRiskColor = (riskLevel: string): string => {
  switch ((riskLevel || '').toLowerCase()) {
    case 'critical': return '#FF3B5C';
    case 'warning': return '#FF7A45';
    case 'caution': return '#FFB627';
    case 'safe':
    default: return '#22D3A6';
  }
};

interface CitizenEvacuationMapProps {
  isScenarioActive: boolean;
  userLocation: { lat: number; lng: number };
  zones: VenueZone[]; // Now accepts ALL zones to mirror the admin map
  venueId?: string;
}

const createBlueDotIcon = () =>
  L.divIcon({
    className: 'custom-blue-dot-icon',
    html: `
      <div style="position: relative; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background-color: #38BDF8; opacity: 0.5; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
        <div style="width: 14px; height: 14px; border-radius: 50%; background-color: #2C7BE5; border: 2.5px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.3);"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

const createGreenExitIcon = () =>
  L.divIcon({
    className: 'custom-green-exit-icon',
    html: `
      <div style="background-color: #22D3A6; color: #151726; font-weight: bold; font-size: 11px; padding: 4px 8px; border-radius: 12px; border: 2px solid #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.25); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
        <span>✓ SAFE EXIT</span>
      </div>
    `,
    iconSize: [85, 28],
    iconAnchor: [42, 14],
  });

export const CitizenEvacuationMap: React.FC<CitizenEvacuationMapProps> = ({ 
  isScenarioActive, 
  userLocation, 
  zones = [],
  venueId = "v-1" 
}) => {
  const [pathCoordinates, setPathCoordinates] = useState<[number, number][]>([
    [userLocation.lat, userLocation.lng]
  ]);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [directions, setDirections] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const response = await api.post('/routing/evacuate', {
          venue_id: venueId,
          current_lat: userLocation.lat,
          current_lng: userLocation.lng
        });

        if (response.data && response.data.waypoints && response.data.waypoints.length > 0) {
          const coords = response.data.waypoints.map((wp: any) => [wp.lat, wp.lng] as [number, number]);
          setPathCoordinates(coords);
          setEstimatedTime(Math.max(1, Math.round(response.data.estimated_time_minutes)));
          
          const newDirs = response.data.waypoints.map((wp: any, i: number) => {
            if (i === 0) return `Start at ${wp.zone_name}`;
            if (i === response.data.waypoints.length - 1) return `Arrive at Safe Exit: ${wp.zone_name}`;
            return `Continue through ${wp.zone_name}`;
          });
          setDirections(newDirs);
        }
      } catch (err) {
        console.error("Failed to fetch live evacuation route", err);
      }
    };

    fetchRoute();
  }, [isScenarioActive, userLocation, venueId]);

  const midTooltipPoint: [number, number] = pathCoordinates.length > 2 
    ? pathCoordinates[Math.floor(pathCoordinates.length / 2)]
    : [userLocation.lat, userLocation.lng];

  return (
    <div className={`bg-white border border-[#E7E5DD] shadow-xs flex flex-col font-body text-[#151726] w-full transition-all duration-300 ${isExpanded ? 'fixed inset-0 z-[9999] rounded-none p-4 sm:p-6' : 'rounded-2xl p-3.5 sm:p-5 gap-3 sm:gap-4 max-w-full'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E7E5DD] pb-3 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-[#2C7BE5]/10 text-[#2C7BE5] shrink-0">
            <Navigation className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse text-[#2C7BE5]" />
          </div>
          <div className="min-w-0 flex flex-col">
            <h3 className="font-heading font-bold text-xs sm:text-base text-[#151726] tracking-tight truncate flex items-center gap-2">
              <span>Live Evacuation Map</span>
              {isScenarioActive && (
                <span className="px-2 py-0.5 rounded-full bg-[#FF3B5C]/15 text-[#FF3B5C] text-[10px] font-mono-num font-bold uppercase shrink-0">
                  Active Reroute
                </span>
              )}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-[#5B5F73] font-mono-num truncate">
              Dynamic pathing mapped to SOA Campus Telemetry
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className="px-2.5 py-1 rounded-full bg-[#22D3A6]/15 text-[#059669] font-mono-num font-bold text-[10px] sm:text-[11px] flex items-center gap-1">
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Estimated Walk: {estimatedTime} mins</span>
          </span>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 bg-[#FAFAF7] hover:bg-[#E7E5DD] border border-[#E7E5DD] rounded-lg transition-colors ml-2 text-[#5B5F73]"
            title={isExpanded ? "Minimize Map" : "Full Screen Map"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className={`relative w-full rounded-xl sm:rounded-2xl border border-[#E7E5DD] overflow-hidden shadow-inner z-10 ${isExpanded ? 'flex-1 mt-4' : 'h-60 sm:h-72 md:h-80'}`}>
        <MapContainer
          center={[userLocation.lat, userLocation.lng]}
          zoom={17}
          scrollWheelZoom={true}
          className="w-full h-full"
          attributionControl={false}
        >
          {/* This fixes the gray tile rendering bug */}
          <MapUpdater center={[userLocation.lat, userLocation.lng]} resizeTrigger={isExpanded} />
          
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          {/* Render all zones with accurate live colors, matching admin panel */}
          {zones.map((zone) => {
            if (!zone.polygon || zone.polygon.length === 0) return null;
            const polygonColor = getRiskColor(zone.riskLevel);
            
            return (
              <Polygon
                key={zone.id}
                positions={zone.polygon}
                pathOptions={{ 
                  color: polygonColor, 
                  fillColor: polygonColor, 
                  fillOpacity: 0.35, 
                  weight: 2 
                }}
              >
                <Popup>
                  <div className="p-1 font-heading font-bold text-xs flex items-center gap-1" style={{ color: polygonColor }}>
                    {zone.riskLevel === 'critical' && <AlertTriangle className="w-3.5 h-3.5" />}
                    <span>{zone.name} ({zone.riskLevel.toUpperCase()})</span>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {pathCoordinates.length > 1 && (
            <Polyline
              positions={pathCoordinates}
              pathOptions={{ color: '#2C7BE5', weight: 6, dashArray: '10, 10', opacity: 0.95, lineCap: 'round' }}
            >
              <Tooltip position={midTooltipPoint} permanent direction="top" className="custom-leaflet-tooltip">
                <span className="font-mono-num font-bold text-[11px] text-[#2C7BE5] bg-white px-2 py-0.5 rounded-md shadow-xs border border-[#2C7BE5]">
                  {estimatedTime}m Walk
                </span>
              </Tooltip>
            </Polyline>
          )}

          <Marker position={[userLocation.lat, userLocation.lng]} icon={createBlueDotIcon()}>
            <Popup>
              <div className="p-1 font-heading font-bold text-xs text-[#2C7BE5]">
                ● You Are Here
              </div>
            </Popup>
          </Marker>

          {pathCoordinates.length > 1 && (
            <Marker position={pathCoordinates[pathCoordinates.length - 1]} icon={createGreenExitIcon()}>
              <Popup>
                <div className="p-1 font-heading font-bold text-xs text-[#059669]">
                  ✓ Safe Exit
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        <div className="absolute bottom-2.5 left-2.5 bg-white/95 backdrop-blur-md px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#E7E5DD] shadow-md z-[1000] text-[10px] sm:text-[11px] font-mono-num flex items-center gap-2.5 sm:gap-3 flex-wrap max-w-[calc(100%-20px)]">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] border border-white shrink-0" />
            <span className="font-bold text-[#151726]">You Are Here</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-[#2C7BE5] border-b border-dashed border-[#2C7BE5] shrink-0" />
            <span className="font-bold text-[#2C7BE5]">Safe Route</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-[#FF3B5C]/50 border border-[#FF3B5C] shrink-0" />
            <span className="font-bold text-[#FF3B5C]">Risk Area</span>
          </div>
        </div>
      </div>

      {!isExpanded && (
        <div className="bg-[#FAFAF7] border border-[#E7E5DD] rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col gap-2.5 mt-4">
          <span className="font-heading font-bold text-xs text-[#151726] uppercase tracking-wider flex items-center gap-1.5">
            <Footprints className="w-3.5 h-3.5 text-[#2C7BE5] shrink-0" />
            <span>Step-by-Step Directions</span>
          </span>

          <div className="space-y-2 text-xs text-[#151726]">
            {directions.length > 0 ? (
              directions.map((dir, idx) => (
                <div key={idx} className="flex items-start gap-2.5 bg-white p-2.5 rounded-xl border border-[#E7E5DD] hover:border-[#2C7BE5]/40 transition-colors">
                  <span className={`w-5 h-5 rounded-full text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                    idx === directions.length - 1 ? 'bg-[#22D3A6] text-[#151726]' : 'bg-[#2C7BE5]'
                  }`}>
                    {idx + 1}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-bold text-[#151726] leading-tight">{dir}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-3 text-[#5B5F73]">Computing optimal safe route...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};