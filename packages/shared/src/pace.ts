import type { Pace, PaceCalculationInput, PaceCalculationResult } from '@run/types';

/**
 * Calculate estimated run time from distance and pace.
 *
 * @example
 *   calculateRunTime({ distanceKm: 10, pace: { minutesPerKm: 5.5 } })
 *   // => { estimatedTimeSeconds: 3300 }  (55 minutes)
 */
export function calculateRunTime(input: PaceCalculationInput): PaceCalculationResult {
  const estimatedTimeSeconds = Math.round(input.distanceKm * input.pace.minutesPerKm * 60);
  return { estimatedTimeSeconds };
}

/**
 * Format a duration given in seconds as a human-readable string (HH:MM:SS or MM:SS).
 *
 * @example
 *   formatDuration(3661)  // => "1:01:01"
 *   formatDuration(330)   // => "5:30"
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`;
}

/**
 * Format a pace (min/km) value as a MM:SS string.
 *
 * @example
 *   formatPace({ minutesPerKm: 5.5 })  // => "5:30"
 */
export function formatPace(pace: Pace): string {
  const minutes = Math.floor(pace.minutesPerKm);
  const seconds = Math.round((pace.minutesPerKm - minutes) * 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Calculate the average pace of a run.
 *
 * @param distanceMetres - total distance in metres
 * @param durationSeconds - total time in seconds
 * @returns Pace in min/km, or `null` if distance is zero
 */
export function calculateAveragePace(distanceMetres: number, durationSeconds: number): Pace | null {
  if (distanceMetres <= 0) return null;
  const distanceKm = distanceMetres / 1000;
  const minutesPerKm = durationSeconds / 60 / distanceKm;
  return { minutesPerKm };
}
