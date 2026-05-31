import type { Coordinate, RouteSuggestion, RouteSuggestionRequest, SurfacePreference } from '@run/types';

const EARTH_RADIUS_KM = 6371;
const OSRM_BASE_URL = 'https://router.project-osrm.org';

/** Labels for the three generated routes. */
const ROUTE_LABELS = ['Route A', 'Route B', 'Route C'] as const;

/**
 * Bearings (in degrees) used to spread route alternatives evenly around the
 * start point.  Three directions 120° apart guarantee good variety.
 */
const ROUTE_BEARINGS = [0, 120, 240] as const;

/**
 * Compute a destination coordinate given an origin, a distance, and a compass
 * bearing using the Haversine / spherical-earth formula.
 *
 * @param origin       - Starting coordinate
 * @param distanceKm   - Distance to travel in kilometres
 * @param bearingDeg   - Compass bearing in degrees (0 = north, 90 = east …)
 * @returns The destination coordinate
 */
export function computeDestination(
  origin: Coordinate,
  distanceKm: number,
  bearingDeg: number,
): Coordinate {
  const bearingRad = (bearingDeg * Math.PI) / 180;
  const lat1 = (origin.latitude * Math.PI) / 180;
  const lon1 = (origin.longitude * Math.PI) / 180;
  const angularDist = distanceKm / EARTH_RADIUS_KM;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDist) +
      Math.cos(lat1) * Math.sin(angularDist) * Math.cos(bearingRad),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDist) * Math.cos(lat1),
      Math.cos(angularDist) - Math.sin(lat1) * Math.sin(lat2),
    );

  return {
    latitude: (lat2 * 180) / Math.PI,
    // Normalise longitude to [-180, 180]
    longitude: ((((lon2 * 180) / Math.PI) % 360) + 540) % 360 - 180,
  };
}

/** Map a surface preference to a human-readable German description. */
function surfaceLabel(surface: SurfacePreference): string {
  switch (surface) {
    case 'paved':
      return 'Asphalt';
    case 'unpaved':
      return 'Trail / Naturweg';
    default:
      return 'Gemischt';
  }
}

type OsrmRouteData = {
  code: string;
  routes?: Array<{
    distance: number;
    geometry: { coordinates: [number, number][] };
  }>;
};

/**
 * Call the OSRM public routing API with a list of waypoints and return the
 * decoded route geometry together with the total distance.
 *
 * Uses the `foot` profile which is appropriate for running and available on
 * the OSRM demo server without an API key.
 *
 * @returns `null` if the request fails or OSRM returns no route.
 */
async function fetchOsrmRoute(
  waypoints: Coordinate[],
): Promise<{ distanceKm: number; routePoints: Coordinate[] } | null> {
  const coordString = waypoints.map((w) => `${w.longitude},${w.latitude}`).join(';');
  const url = `${OSRM_BASE_URL}/route/v1/foot/${coordString}?overview=full&geometries=geojson`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return null;
  }

  if (!response.ok) return null;

  const data: OsrmRouteData = (await response.json()) as OsrmRouteData;

  if (data.code !== 'Ok' || !data.routes?.length) return null;

  const route = data.routes[0];
  const routePoints: Coordinate[] = route.geometry.coordinates.map(([lon, lat]) => ({
    latitude: lat,
    longitude: lon,
  }));

  return { distanceKm: route.distance / 1000, routePoints };
}

/**
 * Generate up to 3 round-trip route suggestions using the OSRM routing engine
 * and OpenStreetMap data.
 *
 * Strategy:
 *  - For each of three compass bearings (0°, 120°, 240°) a midpoint is placed
 *    at `distanceKm / 2` from the origin.
 *  - OSRM routes: origin → midpoint → origin to form a ~`distanceKm` loop.
 *  - Routes whose total distance deviates more than 10 % from the target are
 *    still included but indicated by their actual distance.
 *
 * @param request - Start point, desired distance, and surface preference.
 * @returns Array of route suggestions (may be shorter than 3 if OSRM fails).
 */
export async function fetchRouteSuggestions(
  request: RouteSuggestionRequest,
): Promise<RouteSuggestion[]> {
  const { origin, distanceKm, surface } = request;
  // Place each midpoint halfway along the desired loop distance.
  const midpointDistanceKm = distanceKm / 2;

  const suggestions: RouteSuggestion[] = [];

  for (let i = 0; i < ROUTE_BEARINGS.length; i++) {
    const bearing = ROUTE_BEARINGS[i];
    const midpoint = computeDestination(origin, midpointDistanceKm, bearing);
    const result = await fetchOsrmRoute([origin, midpoint, origin]);

    if (!result) continue;

    suggestions.push({
      id: `route-${i}`,
      label: ROUTE_LABELS[i],
      distanceKm: Math.round(result.distanceKm * 10) / 10,
      // OSRM's free routing API does not provide elevation data.
      // Elevation support can be added via a self-hosted OSRM instance with
      // an elevation dataset, or by switching to GraphHopper / Valhalla.
      elevationMetres: 0,
      surfaceDescription: surfaceLabel(surface),
      waypoints: result.routePoints,
    });
  }

  return suggestions;
}
