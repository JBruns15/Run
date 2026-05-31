/** Geographic coordinate */
export interface Coordinate {
  latitude: number;
  longitude: number;
}

/** A recorded running activity */
export interface Run {
  id: string;
  /** Display name / title for the run */
  name: string;
  /** ISO 8601 start timestamp */
  startedAt: string;
  /** ISO 8601 end timestamp */
  finishedAt: string;
  /** Total distance in metres */
  distanceMetres: number;
  /** Total elapsed time in seconds */
  durationSeconds: number;
  /** Ordered list of GPS waypoints */
  route: Coordinate[];
}

/** Surface type preference for route suggestions */
export type SurfacePreference = 'paved' | 'unpaved' | 'any';

/** Input parameters for requesting a route suggestion */
export interface RouteSuggestionRequest {
  origin: Coordinate;
  /** Desired distance in kilometres */
  distanceKm: number;
  surface: SurfacePreference;
  /**
   * When true the routing engine will try to prefer road segments with a high
   * community run count.  Falls back to standard OSRM routing when heatmap
   * data are unavailable.
   */
  preferPopularRoutes?: boolean;
}

/**
 * Heatmap segment – an anonymised, aggregated record of how often a specific
 * road/path segment has been used by community runners.
 *
 * Only the segment geometry and aggregate counters are stored; no personal
 * data or individual run records are retained (DSGVO-compliant).
 */
export interface HeatmapSegment {
  /** Stable identifier, typically the OSM way ID (e.g. "osm-way-12345"). */
  segmentId: string;
  /** Number of individual runs that traversed this segment. */
  runCount: number;
  /** Sum of all run distances on this segment in kilometres. */
  distanceTotal: number;
  /** Ordered list of coordinates that describe the segment geometry. */
  coordinates: Coordinate[];
}

/** A suggested route returned by the routing engine */
export interface RouteSuggestion {
  id: string;
  /** Human-readable label, e.g. "Route A", "Route B", "Route C" */
  label: string;
  /** Estimated distance in kilometres */
  distanceKm: number;
  /** Estimated elevation gain in metres (0 if unavailable) */
  elevationMetres: number;
  /** Human-readable surface description, e.g. "Asphalt" or "Gemischt" */
  surfaceDescription: string;
  waypoints: Coordinate[];
}

/** Pace expressed as minutes and seconds per kilometre */
export interface Pace {
  minutesPerKm: number;
}

/** Input for pace / time calculation */
export interface PaceCalculationInput {
  distanceKm: number;
  pace: Pace;
}

/** Result of a pace / time calculation */
export interface PaceCalculationResult {
  /** Expected finish time in seconds */
  estimatedTimeSeconds: number;
}
