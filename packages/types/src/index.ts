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
}

/** A suggested route returned by the routing engine */
export interface RouteSuggestion {
  id: string;
  /** Human-readable label, e.g. "Short", "Standard", "Alternative" */
  label: string;
  /** Estimated distance in kilometres */
  distanceKm: number;
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
