/** Earth radius in km */
const R = 6371;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/**
 * Haversine formula — great-circle distance between two lat/lng points.
 * Returns distance in kilometres.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  // Clamp to [0, 1] to guard against floating-point drift on antipodal points.
  const clampedA = Math.min(1, Math.max(0, a));
  return 2 * R * Math.asin(Math.sqrt(clampedA));
}

/**
 * Returns a bounding box [minLat, maxLat, minLng, maxLng] for a given centre
 * and radius in km — useful to pre-filter DB rows before Haversine.
 */
export function boundingBox(
  lat: number,
  lng: number,
  radiusKm: number
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const latDelta = radiusKm / R * (180 / Math.PI);
  // Longitude delta varies by latitude; guard against poles (cos → 0)
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const lngDelta = Math.abs(cosLat) < 1e-12
    ? 180
    : (radiusKm / (R * cosLat)) * (180 / Math.PI);

  // When the radius crosses the ±180° dateline, clamping would exclude valid points.
  // Fall back to the full longitude span in that case.
  const crossesDateline = lng - lngDelta < -180 || lng + lngDelta > 180;
  return {
    minLat: Math.max(-90, lat - latDelta),
    maxLat: Math.min(90,  lat + latDelta),
    minLng: crossesDateline ? -180 : lng - lngDelta,
    maxLng: crossesDateline ?  180 : lng + lngDelta,
  };
}

/** Format km distance for display: "<1 km" or "3.2 km" */
export function formatDistance(km: number): string {
  if (km < 1) return "<1 km";
  return `${km.toFixed(1)} km`;
}
