import type { Run, RunShareCardData } from '@run/types';
import { calculateAveragePace, formatDuration, formatPace } from './pace';

/**
 * Derive all display values needed to render a {@link RunShareCardData} from a
 * raw {@link Run} record.
 *
 * @param run               - The completed run activity.
 * @param averageHeartRate  - Optional average heart rate in bpm.
 * @param streakDays        - Optional current training streak in days.
 */
export function buildShareCardData(
  run: Run,
  averageHeartRate?: number,
  streakDays?: number,
): RunShareCardData {
  const distanceKm = Math.round((run.distanceMetres / 1000) * 100) / 100;

  const pace = calculateAveragePace(run.distanceMetres, run.durationSeconds);
  const formattedPace = pace ? `${formatPace(pace)} min/km` : '--:-- min/km';

  const formattedDate = new Date(run.startedAt).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return {
    run,
    distanceKm,
    formattedDuration: formatDuration(run.durationSeconds),
    formattedPace,
    formattedDate,
    averageHeartRate,
    streakDays,
  };
}
