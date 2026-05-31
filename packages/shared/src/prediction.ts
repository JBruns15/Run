import type { DistancePrediction, PerformancePredictionResult, Run } from '@run/types';
import { formatDuration } from './pace';

/** Standard distances for which predictions are generated (in km). */
const PREDICTION_DISTANCES_KM = [1, 2, 5, 10] as const;

/** Riegel fatigue exponent used for distance-based time projection. */
const RIEGEL_EXPONENT = 1.06;

/** Maximum lookback window in weeks. */
const WEEKS_LOOKBACK = 8;

/** Maximum number of recent runs to include in the calculation. */
const MAX_RUNS = 20;

/**
 * Project a finish time from a known reference performance to a new distance
 * using the Riegel endurance formula:
 *   T₂ = T₁ × (D₂ / D₁)^1.06
 *
 * @param refTimeSeconds   - Known finish time (seconds) over refDistanceKm
 * @param refDistanceKm    - Reference distance (km)
 * @param targetDistanceKm - Target distance to predict (km)
 */
function riegelProject(
  refTimeSeconds: number,
  refDistanceKm: number,
  targetDistanceKm: number,
): number {
  return refTimeSeconds * Math.pow(targetDistanceKm / refDistanceKm, RIEGEL_EXPONENT);
}

/**
 * Compute a recency-weighted average pace (min/km) from a pre-sorted list of
 * runs (newest first).  Runs are weighted by an exponential decay so that the
 * most recent run has weight 1.0 and weight halves every 10 runs.
 *
 * Returns `null` when no valid run data is available.
 */
function weightedAveragePace(sortedRuns: Run[]): number | null {
  let totalWeight = 0;
  let weightedSum = 0;

  sortedRuns.forEach((run, index) => {
    const distanceKm = run.distanceMetres / 1000;
    if (distanceKm <= 0 || run.durationSeconds <= 0) return;

    const paceMinPerKm = run.durationSeconds / 60 / distanceKm;
    // Exponential decay: weight = 2^(−index/10) so weight halves every 10 runs
    const weight = Math.pow(2, -index / 10);
    weightedSum += paceMinPerKm * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

/**
 * Calculate performance predictions for the standard distances (1 km, 2 km,
 * 5 km, 10 km) based on a runner's recent training history.
 *
 * ### Algorithm (MVP)
 * 1. Filter runs to the last {@link WEEKS_LOOKBACK} weeks, capped at
 *    {@link MAX_RUNS} most-recent entries.
 * 2. Compute a recency-weighted average pace (min/km).
 * 3. Use the Riegel formula to project that pace to each target distance.
 * 4. Derive a confidence interval from the standard deviation of individual
 *    run paces (clamped to 3 %–10 %).
 * 5. Generate motivational messages when trends are detectable.
 *
 * @param runs - All available runs for the athlete (unsorted, any length)
 * @returns    Prediction result including per-distance forecasts and messages
 */
export function calculatePerformancePredictions(runs: Run[]): PerformancePredictionResult {
  const now = Date.now();
  const cutoffMs = now - WEEKS_LOOKBACK * 7 * 24 * 3_600_000;

  // Filter to recent, valid runs and sort newest-first
  const recentRuns = runs
    .filter(
      (r) =>
        new Date(r.startedAt).getTime() >= cutoffMs &&
        r.distanceMetres > 0 &&
        r.durationSeconds > 0,
    )
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, MAX_RUNS);

  if (recentRuns.length === 0) {
    return { predictions: [], motivationMessages: [] };
  }

  // --- Weighted average pace ------------------------------------------------
  const avgPaceMinPerKm = weightedAveragePace(recentRuns);
  if (avgPaceMinPerKm === null) {
    return { predictions: [], motivationMessages: [] };
  }

  // --- Pace standard deviation (for confidence interval) --------------------
  const paces = recentRuns
    .filter((r) => r.distanceMetres > 0 && r.durationSeconds > 0)
    .map((r) => r.durationSeconds / 60 / (r.distanceMetres / 1000));

  const variance =
    paces.length > 1
      ? paces.reduce((sum, p) => sum + Math.pow(p - avgPaceMinPerKm, 2), 0) / (paces.length - 1)
      : 0;

  // Clamp confidence factor to [3 %, 10 %] of expected time
  const confidenceFactor = Math.min(
    Math.max(Math.sqrt(variance) / avgPaceMinPerKm, 0.03),
    0.1,
  );

  // --- Predictions via Riegel -----------------------------------------------
  // Use 1 km as the reference distance for the Riegel projection
  const refDistanceKm = 1;
  const refTimeSeconds = avgPaceMinPerKm * 60; // time to run 1 km at average pace

  const predictions: DistancePrediction[] = PREDICTION_DISTANCES_KM.map((distanceKm) => {
    const expectedSeconds = Math.round(riegelProject(refTimeSeconds, refDistanceKm, distanceKm));
    return {
      distanceKm,
      expectedSeconds,
      optimisticSeconds: Math.round(expectedSeconds * (1 - confidenceFactor)),
      conservativeSeconds: Math.round(expectedSeconds * (1 + confidenceFactor)),
    };
  });

  // --- Motivation messages --------------------------------------------------
  const motivationMessages: string[] = [];

  if (recentRuns.length >= 3) {
    const newestPace =
      recentRuns[0].durationSeconds / 60 / (recentRuns[0].distanceMetres / 1000);
    const oldestPace =
      recentRuns[recentRuns.length - 1].durationSeconds /
      60 /
      (recentRuns[recentRuns.length - 1].distanceMetres / 1000);

    if (newestPace < oldestPace) {
      // Runner is getting faster – calculate improvement at 5 km
      const old5kmSeconds = Math.round(riegelProject(oldestPace * 60, refDistanceKm, 5));
      const new5kmSeconds = Math.round(riegelProject(newestPace * 60, refDistanceKm, 5));
      const improvementAt5kmSeconds = old5kmSeconds - new5kmSeconds;
      const improvementStr = formatDuration(improvementAt5kmSeconds);
      motivationMessages.push(
        `Deine 5-km-Prognose hat sich in den letzten ${WEEKS_LOOKBACK} Wochen um ${improvementStr} Minuten verbessert.`,
      );
      motivationMessages.push('Deine Ausdauer verbessert sich kontinuierlich.');
    }

    // Identify best pace in the dataset
    const bestPace = Math.min(...paces);
    if (newestPace <= bestPace * 1.02) {
      motivationMessages.push(`Aktuell bist du in deiner besten Form der letzten ${WEEKS_LOOKBACK} Wochen.`);
    }
  }

  return { predictions, motivationMessages };
}
