import React from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, Marker, Tooltip, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Footprints, Clock, AlertTriangle } from 'lucide-react';

interface CitizenEvacuationMapProps {
  isScenarioActive: boolean;
}

// Custom Leaflet DivIcons for Node A (Blue Dot) and Node B (Green Safe Exit Pin)
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
        <span>✓ EXIT 4</span>
      </div>
    `,
    iconSize: [75, 28],
    iconAnchor: [37, 14],
  });

export const CitizenEvacuationMap: React.FC<CitizenEvacuationMapProps> = ({ isScenarioActive }) => {
  // Center of Map around venue coordinates
  const centerLat = 20.2982;
  const centerLng = 85.8248;

  // 1. Red High-Risk Surge Zone Polygon (Gate 3 Bottleneck)
  const surgeZonePolygon: [number, number][] = [
    [20.2965, 85.8238],
    [20.2978, 85.8255],
    [20.2968, 85.8265],
    [20.2958, 85.8248],
  ];

  // 2. Dynamic Segmented Polyline Path (5 Lat/Lng Waypoints explicit routing around Red Zone)
  const aStarPathCoordinates: [number, number][] = [
    [20.2961, 85.8245], // Node A: Current Location (Gate 3 Entrance)
    [20.2962, 85.8225], // Waypoint 1: Head West away from Gate 3 surge
    [20.2985, 85.8228], // Waypoint 2: Head North along Aux Corridor 4
    [20.3005, 85.8250], // Waypoint 3: Bend East around northern perimeter
    [20.3010, 85.8270], // Node B: Safe Exit Gate 4
  ];

  // Midpoint coordinate for permanently visible Tooltip
  const midTooltipPoint: [number, number] = [20.2985, 85.8228];

  return (
    <div className="bg-white border border-[#E7E5DD] rounded-2xl p-3.5 sm:p-5 shadow-xs flex flex-col gap-3 sm:gap-4 font-body text-[#151726] w-full max-w-full">
      {/* Header Bar */}
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
            <span>Estimated Walk: 2.5 mins</span>
          </span>
        </div>
      </div>

      {/* Light Theme Leaflet Map Container */}
      <div className="relative w-full h-60 sm:h-72 md:h-80 rounded-xl sm:rounded-2xl border border-[#E7E5DD] overflow-hidden shadow-inner z-10">
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={16}
          scrollWheelZoom={false}
          className="w-full h-full"
          attributionControl={false}
        >
          {/* CartoDB Positron Light Tile Layer */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={19}
          />

          {/* Red Polygon for High-Risk Surge Zone (Gate 3) */}
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
                <span>Gate 3 (Very Crowded Area)</span>
              </div>
            </Popup>
          </Polygon>

          {/* Dynamic Segmented Polyline Path (Bending around red polygon) */}
          <Polyline
            positions={aStarPathCoordinates}
            pathOptions={{
              color: '#2C7BE5',
              weight: 6,
              dashArray: '10, 10',
              opacity: 0.95,
              lineCap: 'round',
            }}
          >
            {/* Permanent Distance Tooltip along middle segment */}
            <Tooltip position={midTooltipPoint} permanent direction="top" className="custom-leaflet-tooltip">
              <span className="font-mono-num font-bold text-[11px] text-[#2C7BE5] bg-white px-2 py-0.5 rounded-md shadow-xs border border-[#2C7BE5]">
                450m via Safe Route
              </span>
            </Tooltip>
          </Polyline>

          {/* Marker Node A: Blue Dot User Location */}
          <Marker position={aStarPathCoordinates[0]} icon={createBlueDotIcon()}>
            <Popup>
              <div className="p-1 font-heading font-bold text-xs text-[#2C7BE5]">
                ● You Are Here
              </div>
            </Popup>
          </Marker>

          {/* Marker Node B: Green Exit Pin */}
          <Marker position={aStarPathCoordinates[aStarPathCoordinates.length - 1]} icon={createGreenExitIcon()}>
            <Popup>
              <div className="p-1 font-heading font-bold text-xs text-[#059669]">
                ✓ Safe Exit: Gate 4
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Map Legend Overlay */}
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

      {/* Turn-by-Turn Instruction List */}
      <div className="bg-[#FAFAF7] border border-[#E7E5DD] rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col gap-2.5">
        <span className="font-heading font-bold text-xs text-[#151726] uppercase tracking-wider flex items-center gap-1.5">
          <Footprints className="w-3.5 h-3.5 text-[#2C7BE5] shrink-0" />
          <span>Step-by-Step Directions</span>
        </span>

        <div className="space-y-2 text-xs text-[#151726]">
          <div className="flex items-start gap-2.5 bg-white p-2.5 rounded-xl border border-[#E7E5DD] hover:border-[#2C7BE5]/40 transition-colors">
            <span className="w-5 h-5 rounded-full bg-[#2C7BE5] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              1
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[#151726] leading-tight">Head West 50m toward West Concourse.</span>
              <span className="text-[10px] sm:text-[11px] text-[#5B5F73] mt-0.5">Move away from crowded Gate 3.</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-white p-2.5 rounded-xl border border-[#E7E5DD] hover:border-[#FF7A45]/40 transition-colors">
            <span className="w-5 h-5 rounded-full bg-[#FF7A45] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              2
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[#151726] leading-tight">Turn Right onto Corridor 4.</span>
              <span className="text-[10px] sm:text-[11px] text-[#5B5F73] mt-0.5">Bypasses Gate 3 crowds and heavy pushing.</span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-white p-2.5 rounded-xl border border-[#E7E5DD] hover:border-[#22D3A6]/40 transition-colors">
            <span className="w-5 h-5 rounded-full bg-[#22D3A6] text-[#151726] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
              3
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[#151726] leading-tight">Walk 400m along the lighted hallway to Exit Gate 4.</span>
              <span className="text-[10px] sm:text-[11px] text-[#059669] font-bold mt-0.5">Exit gates are unlocked and open.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};