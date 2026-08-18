    
//{ Check if user is within the zone radius + 50 meters buffer}
import * as turf from '@turf/turf';
export interface GeofenceZone {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  riskLevel: string;
}

export const checkGeofenceIntersections = (
  userLat: number,
  userLng: number,
  zones: GeofenceZone[]
): GeofenceZone[] => {
  const userPoint = turf.point([userLng, userLat]);
  const intersections: GeofenceZone[] = [];
  for (const zone of zones) {
    if (zone.riskLevel === 'critical' || zone.riskLevel === 'warning') {
      const zoneCenter = turf.point([zone.centerLng, zone.centerLat]);
      const distance = turf.distance(userPoint, zoneCenter, { units: 'meters' });
            if (distance <= zone.radiusMeters + 50) {
        intersections.push(zone);
      }
    }
  }

  return intersections;
};
