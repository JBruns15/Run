import type { Run, StreakConfig, StreakMilestone, StreakResult } from '@run/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default streak configuration */
const DEFAULT_CONFIG: StreakConfig = {
  restDayBufferEnabled: false,
  flexibleModeEnabled: false,
  maxFreezeTokensPerMonth: 1,
};

/** Ordered list of streak milestones (ascending by days). */
export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, label: 'Start dranbleiben', emoji: '🌱' },
  { days: 5, label: 'Momentum', emoji: '⚡' },
  { days: 7, label: '7-Tage-Serie geschafft', emoji: '🏆' },
  { days: 14, label: 'Konstanz aufgebaut', emoji: '💪' },
  { days: 30, label: 'Disziplin-Level', emoji: '🔥' },
];

// ---------------------------------------------------------------------------
// Date helpers (all dates in UTC / ISO YYYY-MM-DD)
// ---------------------------------------------------------------------------

/** Return today's date as a YYYY-MM-DD string (UTC). */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Add `days` (positive or negative) to a YYYY-MM-DD date string and return the result. */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Return the number of calendar days between two YYYY-MM-DD strings (b − a). */
function daysBetween(a: string, b: string): number {
  const msA = new Date(a + 'T00:00:00Z').getTime();
  const msB = new Date(b + 'T00:00:00Z').getTime();
  return Math.round((msB - msA) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extract the unique set of active run dates (YYYY-MM-DD, UTC) from a list
 * of runs.  Runs with zero distance or duration are ignored.
 */
function buildActiveDateSet(runs: Run[]): Set<string> {
  const dates = new Set<string>();
  for (const run of runs) {
    if (run.distanceMetres > 0 && run.durationSeconds > 0) {
      dates.add(run.startedAt.slice(0, 10));
    }
  }
  return dates;
}

/**
 * Walk backwards from `anchor` (inclusive) and count the length of the
 * unbroken streak.
 *
 * With `restDayBuffer` enabled one rest-day gap is permitted per 7-day
 * window without breaking the chain.  Gap days do not count toward the
 * streak total.
 *
 * @param anchor      - The most-recent active date (YYYY-MM-DD), inclusive.
 * @param activeDates - Set of all dates on which runs were recorded.
 * @param restDayBuffer - Whether one rest-day gap per week is allowed.
 * @returns The streak count (number of active run days in the unbroken chain).
 */
function walkStreak(anchor: string, activeDates: Set<string>, restDayBuffer: boolean): number {
  let streak = 1; // anchor itself counts
  let current = addDays(anchor, -1);
  let skipsAvailable = restDayBuffer ? 1 : 0;
  let daysSinceLastSkipReset = 0;

  while (true) {
    daysSinceLastSkipReset++;

    // Reset the weekly skip allowance every 7 calendar steps
    if (restDayBuffer && daysSinceLastSkipReset % 7 === 0) {
      skipsAvailable = 1;
    }

    if (activeDates.has(current)) {
      streak++;
      current = addDays(current, -1);
    } else if (skipsAvailable > 0) {
      // Use the rest-day buffer – skip without breaking the chain
      skipsAvailable--;
      current = addDays(current, -1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Compute the all-time best streak from a sorted (ascending) list of unique
 * active dates.  No rest-day buffer is applied here – best streak is always
 * counted strictly from consecutive calendar days.
 */
function computeBestStreak(sortedDates: string[]): number {
  if (sortedDates.length === 0) return 0;

  let best = 1;
  let current = 1;

  for (let i = 1; i < sortedDates.length; i++) {
    const diff = daysBetween(sortedDates[i - 1], sortedDates[i]);
    if (diff === 1) {
      current++;
      if (current > best) best = current;
    } else {
      current = 1;
    }
  }

  return best;
}

/**
 * Check the flexible-mode 7-day goal: returns true when the runner recorded
 * at least 7 distinct active days within any rolling 7-to-9-day window ending
 * on or before today.
 */
function checkFlexibleSevenDay(activeDates: Set<string>): boolean {
  const today = todayUTC();
  const WINDOW_MAX = 9;
  const TARGET = 7;

  // Check each possible window end date (today back to 7 days ago)
  for (let endOffset = 0; endOffset <= WINDOW_MAX - TARGET; endOffset++) {
    const windowEnd = addDays(today, -endOffset);
    let count = 0;
    for (let d = 0; d < WINDOW_MAX; d++) {
      if (activeDates.has(addDays(windowEnd, -d))) count++;
    }
    if (count >= TARGET) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculate the runner's streak status from their run history.
 *
 * ### Streak rules
 * - A streak day requires at least one completed run (distanceMetres > 0 and
 *   durationSeconds > 0).
 * - The streak starts from today; if today has no run yet the chain may still
 *   continue from yesterday (grace period of one calendar day).
 * - With `restDayBufferEnabled` one rest day per 7-day window is tolerated
 *   without breaking the streak.
 * - With `flexibleModeEnabled` reaching 7 active days within a 7-to-9 day
 *   rolling window also counts as the 7-day series goal.
 *
 * @param runs   - All run records for the athlete (unsorted).
 * @param config - Optional streak configuration (falls back to defaults).
 * @returns      A {@link StreakResult} with all streak metrics.
 */
export function calculateStreak(
  runs: Run[],
  config: Partial<StreakConfig> = {},
): StreakResult {
  const cfg: StreakConfig = { ...DEFAULT_CONFIG, ...config };
  const activeDateSet = buildActiveDateSet(runs);
  const activeDates = Array.from(activeDateSet).sort();

  // --- Determine anchor date (most-recent active day within grace window) ---
  const today = todayUTC();
  const yesterday = addDays(today, -1);

  let anchor: string | null = null;
  if (activeDateSet.has(today)) {
    anchor = today;
  } else if (activeDateSet.has(yesterday)) {
    anchor = yesterday;
  }

  // --- Current streak -------------------------------------------------------
  const currentStreak =
    anchor !== null
      ? walkStreak(anchor, activeDateSet, cfg.restDayBufferEnabled)
      : 0;

  // --- Best streak ----------------------------------------------------------
  const rawBest = computeBestStreak(activeDates);
  const bestStreak = Math.max(rawBest, currentStreak);

  // --- 7-day goal -----------------------------------------------------------
  const strictGoal = currentStreak >= 7;
  const flexGoal = cfg.flexibleModeEnabled && checkFlexibleSevenDay(activeDateSet);
  const sevenDayGoalReached = strictGoal || flexGoal;

  // --- Milestones -----------------------------------------------------------
  const reachedMilestones = STREAK_MILESTONES.filter((m) => currentStreak >= m.days);
  const nextMilestone = STREAK_MILESTONES.find((m) => currentStreak < m.days) ?? null;
  const daysToNextMilestone = nextMilestone ? nextMilestone.days - currentStreak : null;

  // --- Motivation messages --------------------------------------------------
  const motivationMessages: string[] = [];

  if (currentStreak > 0 && anchor !== null) {
    // Streak-kept message
    if (activeDateSet.has(today)) {
      motivationMessages.push(
        `🔥 Streak gehalten! Du bist bei ${currentStreak} ${currentStreak === 1 ? 'Tag' : 'Tagen'} in Folge.`,
      );
    }

    // Progress toward 7 days
    if (currentStreak < 7) {
      const remaining = 7 - currentStreak;
      motivationMessages.push(
        `Nur noch ${remaining} ${remaining === 1 ? 'Tag' : 'Tage'} bis zum 7-Tage-Ziel.`,
      );
    }

    // 7-day goal reached
    if (sevenDayGoalReached && currentStreak >= 7) {
      motivationMessages.push('🏆 7-Tage-Serie geschafft! Stark – du baust gerade eine Routine auf.');
    }

    // Next milestone hint
    if (nextMilestone && daysToNextMilestone !== null && daysToNextMilestone <= 3) {
      motivationMessages.push(
        `${nextMilestone.emoji} Noch ${daysToNextMilestone} ${daysToNextMilestone === 1 ? 'Tag' : 'Tage'} bis: „${nextMilestone.label}"`,
      );
    }

    // Streak-building encouragement
    if (currentStreak >= 3 && currentStreak < 7) {
      motivationMessages.push('Stark – du baust gerade eine Routine auf.');
    }
  }

  // How many days ago was the last run? (if > 1 day → streak is 0 but warn)
  if (currentStreak === 0 && activeDates.length > 0) {
    const lastDate = activeDates[activeDates.length - 1];
    const gap = daysBetween(lastDate, today);
    if (gap === 2) {
      motivationMessages.push('Lauf heute, um deinen Streak wieder zu starten!');
    }
  }

  return {
    currentStreak,
    bestStreak,
    lastActiveDate: anchor,
    nextMilestone,
    daysToNextMilestone,
    reachedMilestones,
    sevenDayGoalReached,
    motivationMessages,
    activeDates,
  };
}
