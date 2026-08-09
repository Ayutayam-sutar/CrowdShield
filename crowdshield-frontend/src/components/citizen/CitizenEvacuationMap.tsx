import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Tooltip, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Footprints, Clock, AlertTriangle } from 'lucide-react';
import api from '../../utils/api';

interface CitizenEvacuationMapProps {
  isScenarioActive: boolean;
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

export const CitizenEvacuationMap: React.FC<CitizenEvacuationMapProps> = ({ isScenarioActive }) => {
  // Mock current user location near Admin Block
  const currentLat = 20.2510;
  const currentLng = 85.7983;

  const centerLat = 20.2496;
  const centerLng = 85.7988;

  const [pathCoordinates, setPathCoordinates] = useState<[number, number][]>([
    [20.2510, 85.7983],
    [20.2485, 85.7980],
    [20.2475, 85.7975]
  ]);
  const [estimatedTime, setEstimatedTime] = useState<number>(3);
  const [directions, setDirections] = useState<string[]>([]);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const response = await api.post('/routing/evacuate', {
          venue_id: 'soa-iter-01', // FIXED: Now matches our DB Seeder!
          current_lat: currentLat,
          current_lng: currentLng
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
        console.error("Failed to fetch evacuation route", err);
      }
    };

    fetchRoute();
  }, [isScenarioActive]);

  // Red High-Risk Surge Zone Polygon around the Library Roundabout
  const surgeZonePolygon: [number, number][] = [
    [20.2499, 85.7985],
    [20.2499, 85.7991],
    [20.2493, 85.7991],
    [20.2493, 85.7985],
  ];

  const midTooltipPoint: [number, number] = pathCoordinates.length > 2 
    ? pathCoordinates[Math.floor(pathCoordinates.length / 2)]
    : [20.2485, 85.7980];

  return (
    <div className="bg-white border border-[#E7E5DD] rounded-2xl p-3.5 sm:p-5 shadow-xs flex flex-col gap-3 sm:gap-4 font-body text-[#151726] w-full max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E7E5DD] pb-3 gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-[#2C7BE5]/10 text-[#2C7BE5] shrink-0">
            <Navigation className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse text-[#2C7BE5]" />
          </div>
          <div className="min-w-0 flex flex-col">
            <h3 className="font-heading font-bold text-xs sm:text-base text-[#151726] tracking-tight truncate flex items-center gap-2">
              <span>Safe Exit Route</span>
              {isScenarioActive && (
                <span className="px-2 py-0.5 rounded-full bg-[#FF3B5C]/15 text-[#FF3B5C] text-[10px] font-mono-num font-bold uppercase shrink-0">
                  Active Reroute
                </span>
              )}
            </h3>
            <p className="text-[10px] sm:text-[11px] text-[#5B5F73] font-mono-num truncate">
              Clear path avoiding crowded areas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <span className="px-2.5 py-1 rounded-full bg-[#22D3A6]/15 text-[#059669] font-mono-num font-bold text-[10px] sm:text-[11px] flex items-center gap-1">
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>Estimated Walk: {estimatedTime} mins</span>
          </span>
        </div>
      </div>

      <div className="relative w-full h-60 sm:h-72 md:h-80 rounded-xl sm:rounded-2xl border border-[#E7E5DD] overflow-hidden shadow-inner z-10">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={17}
          scrollWheelZoom={false}
          className="w-full h-full"
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />

          <Polygon
            positions={surgeZonePolygon}
            pathOptions={{
              color: '#FF3B5C',
              fillColor: '#FF3B5C',
              fillOpacity: 0.4,
              weight: 2,
            }}
          >
            <Popup>
              <div className="p-1 font-heading font-bold text-xs text-[#FF3B5C] flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Central Library Roundabout (Crowded)</span>
              </div>
            </Popup>
          </Polygon>

          <Polyline
            positions={pathCoordinates}
            pathOptions={{
              color: '#2C7BE5',
              weight: 6,
              dashArray: '10, 10',
              opacity: 0.95,
              lineCap: 'round',
            }}
          >
            <Tooltip position={midTooltipPoint} permanent direction="top" className="custom-leaflet-tooltip">
              <span className="font-mono-num font-bold text-[11px] text-[#2C7BE5] bg-white px-2 py-0.5 rounded-md shadow-xs border border-[#2C7BE5]">
                {estimatedTime}m Walk
              </span>
            </Tooltip>
          </Polyline>

          <Marker position={pathCoordinates[0] || [centerLat, centerLng]} icon={createBlueDotIcon()}>
            <Popup>
              <div className="p-1 font-heading font-bold text-xs text-[#2C7BE5]">
                ● You Are Here
              </div>
            </Popup>
          </Marker>

          <Marker position={pathCoordinates[pathCoordinates.length - 1] || [centerLat, centerLng]} icon={createGreenExitIcon()}>
            <Popup>
              <div className="p-1 font-heading font-bold text-xs text-[#059669]">
                ✓ Safe Exit
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        <div className="absolute bottom-2.5 left-2.5 bg-white/95 backdrop-blur-md px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#E7E5DD] shadow-md z-20 text-[10px] sm:text-[11px] font-mono-num flex items-center gap-2.5 sm:gap-3 flex-wrap max-w-[calc(100%-20px)]">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] border border-white shrink-0" />
            <span className="font-bold text-[#151726]">You Are Here</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-[#2C7BE5] border-b border-dashed border-[#2C7BE5] shrink-0" />
            <span className="font-bold text-[#2C7BE5]">Safe Path</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-[#FF3B5C]/50 border border-[#FF3B5C] shrink-0" />
            <span className="font-bold text-[#FF3B5C]">Crowded Area</span>
          </div>
        </div>
      </div>

      <div className="bg-[#FAFAF7] border border-[#E7E5DD] rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col gap-2.5">
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
    </div>
  );
};