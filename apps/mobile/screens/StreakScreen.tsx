import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { calculateStreak, STREAK_MILESTONES } from '@run/shared';
import type { Run, StreakConfig } from '@run/types';

/**
 * Sample training history for the streak demo (14 days with a 4-day active
 * streak and a previous 12-day best).  Replace with real Supabase data once
 * persistence is wired up.
 */
const SAMPLE_RUNS: Run[] = [
  // Current 4-day streak
  {
    id: 's1',
    name: 'Morgenlauf',
    startedAt: new Date(Date.now() - 0 * 24 * 3600_000).toISOString(),
    finishedAt: new Date(Date.now() - 0 * 24 * 3600_000 + 1800_000).toISOString(),
    distanceMetres: 5200,
    durationSeconds: 1680,
    route: [],
  },
  {
    id: 's2',
    name: 'Tempolauf',
    startedAt: new Date(Date.now() - 1 * 24 * 3600_000).toISOString(),
    finishedAt: new Date(Date.now() - 1 * 24 * 3600_000 + 1260_000).toISOString(),
    distanceMetres: 4000,
    durationSeconds: 1260,
    route: [],
  },
  {
    id: 's3',
    name: 'Erholungslauf',
    startedAt: new Date(Date.now() - 2 * 24 * 3600_000).toISOString(),
    finishedAt: new Date(Date.now() - 2 * 24 * 3600_000 + 1500_000).toISOString(),
    distanceMetres: 3000,
    durationSeconds: 1080,
    route: [],
  },
  {
    id: 's4',
    name: 'Langer Lauf',
    startedAt: new Date(Date.now() - 3 * 24 * 3600_000).toISOString(),
    finishedAt: new Date(Date.now() - 3 * 24 * 3600_000 + 3600_000).toISOString(),
    distanceMetres: 10000,
    durationSeconds: 3600,
    route: [],
  },
  // Gap of 2 days, then older runs
  {
    id: 's5',
    name: 'Intervalltraining',
    startedAt: new Date(Date.now() - 6 * 24 * 3600_000).toISOString(),
    finishedAt: new Date(Date.now() - 6 * 24 * 3600_000 + 1320_000).toISOString(),
    distanceMetres: 4000,
    durationSeconds: 1320,
    route: [],
  },
  {
    id: 's6',
    name: 'Morgenlauf',
    startedAt: new Date(Date.now() - 7 * 24 * 3600_000).toISOString(),
    finishedAt: new Date(Date.now() - 7 * 24 * 3600_000 + 1800_000).toISOString(),
    distanceMetres: 5000,
    durationSeconds: 1800,
    route: [],
  },
  // Previous best-streak segment (12 days, 30–42 days ago)
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `best${i}`,
    name: 'Trainingslauf',
    startedAt: new Date(Date.now() - (30 + i) * 24 * 3600_000).toISOString(),
    finishedAt: new Date(Date.now() - (30 + i) * 24 * 3600_000 + 1800_000).toISOString(),
    distanceMetres: 5000,
    durationSeconds: 1800,
    route: [],
  })),
];

/** Streak config used for the demo – rest-day buffer off, flexible mode off. */
const DEMO_CONFIG: Partial<StreakConfig> = {
  restDayBufferEnabled: false,
  flexibleModeEnabled: false,
};

/** Available freeze tokens displayed in the UI (would come from persisted state). */
const DEMO_FREEZE_TOKENS = 1;

/** Number of weeks to show in the activity calendar. */
const CALENDAR_WEEKS = 4;

// ---------------------------------------------------------------------------

/**
 * Screen showing the runner's streak status, milestones, activity calendar
 * and freeze-token information.
 */
export default function StreakScreen() {
  const result = useMemo(() => calculateStreak(SAMPLE_RUNS, DEMO_CONFIG), []);

  /** Size of the flame icon: grows from 1× to 3× between 0 and 30 days. */
  const flameSize = Math.min(40 + result.currentStreak * 2, 72);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <Text style={styles.heading}>Streak & Konsistenz</Text>
      <Text style={styles.subheading}>Deine Trainings-Serie</Text>

      {/* ── Streak stats row ──────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <StatCard
          emoji={`🔥`}
          emojiSize={flameSize}
          value={String(result.currentStreak)}
          label="Aktueller Streak"
          unit="Tage"
          accent="#E53935"
        />
        <StatCard
          emoji="🏆"
          value={String(result.bestStreak)}
          label="Best Streak"
          unit="Tage"
          accent="#FB8C00"
        />
        <StatCard
          emoji="🎯"
          value={result.nextMilestone ? String(result.nextMilestone.days) : '✓'}
          label="Nächstes Ziel"
          unit={result.nextMilestone ? 'Tage' : ''}
          accent="#1E88E5"
        />
      </View>

      {/* ── 7-day progress bar ────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>🎯 7-Tage-Ziel</Text>
          <Text style={styles.progressCount}>
            {Math.min(result.currentStreak, 7)} / 7
          </Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min((result.currentStreak / 7) * 100, 100)}%`,
                backgroundColor: result.sevenDayGoalReached ? '#43A047' : '#E53935',
              },
            ]}
          />
        </View>
        {result.sevenDayGoalReached ? (
          <Text style={styles.progressDone}>🏆 7-Tage-Serie geschafft!</Text>
        ) : result.daysToNextMilestone !== null && result.nextMilestone?.days === 7 ? (
          <Text style={styles.progressHint}>
            Noch {result.daysToNextMilestone}{' '}
            {result.daysToNextMilestone === 1 ? 'Tag' : 'Tage'} bis zum Ziel
          </Text>
        ) : null}
      </View>

      {/* ── Motivation messages ───────────────────────────────────────── */}
      {result.motivationMessages.length > 0 && (
        <View style={styles.motivationCard}>
          <Text style={styles.motivationTitle}>💬 Feedback</Text>
          {result.motivationMessages.map((msg, i) => (
            <Text key={i} style={styles.motivationText}>
              {msg}
            </Text>
          ))}
        </View>
      )}

      {/* ── Milestones ────────────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Meilensteine</Text>
        {STREAK_MILESTONES.map((m) => {
          const reached = result.currentStreak >= m.days;
          return (
            <View key={m.days} style={styles.milestoneRow}>
              <Text style={[styles.milestoneEmoji, !reached && styles.milestoneDim]}>
                {m.emoji}
              </Text>
              <View style={styles.milestoneInfo}>
                <Text style={[styles.milestoneLabel, !reached && styles.milestoneDim]}>
                  {m.label}
                </Text>
                <Text style={styles.milestoneDays}>{m.days} Tage</Text>
              </View>
              <Text style={[styles.milestoneBadge, reached && styles.milestoneBadgeReached]}>
                {reached ? '✓' : `${m.days - result.currentStreak}d`}
              </Text>
            </View>
          );
        })}
      </View>

      {/* ── Activity calendar (last CALENDAR_WEEKS weeks) ─────────────── */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Aktivitäts-Kalender</Text>
        <ActivityCalendar activeDates={result.activeDates} weeks={CALENDAR_WEEKS} />
      </View>

      {/* ── Streak protection ─────────────────────────────────────────── */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>🛡️ Streak-Schutz</Text>

        {/* Freeze tokens */}
        <View style={styles.freezeRow}>
          <Text style={styles.freezeLabel}>Freeze-Tokens (diesen Monat)</Text>
          <View style={styles.freezeTokens}>
            {Array.from({ length: 2 }).map((_, i) => (
              <Text
                key={i}
                style={[styles.freezeToken, i < DEMO_FREEZE_TOKENS && styles.freezeTokenActive]}
              >
                ❄️
              </Text>
            ))}
          </View>
        </View>

        <Text style={styles.freezeHint}>
          {DEMO_FREEZE_TOKENS > 0
            ? `${DEMO_FREEZE_TOKENS} Freeze-Token verfügbar. Schützt deinen Streak bei Krankheit oder Reisen.`
            : 'Keine Freeze-Tokens mehr. Nächste Tokens gibt es am 1. des nächsten Monats.'}
        </Text>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Small stat card used in the three-column stats row. */
function StatCard({
  emoji,
  emojiSize = 32,
  value,
  label,
  unit,
  accent,
}: {
  emoji: string;
  emojiSize?: number;
  value: string;
  label: string;
  unit: string;
  accent: string;
}) {
  return (
    <View style={[styles.statCard, { borderTopColor: accent }]}>
      <Text style={{ fontSize: emojiSize, lineHeight: emojiSize + 8 }}>{emoji}</Text>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      {unit ? <Text style={styles.statUnit}>{unit}</Text> : null}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/**
 * A compact calendar grid showing the last `weeks` * 7 days.
 * Active days are highlighted; today gets a border.
 */
function ActivityCalendar({
  activeDates,
  weeks,
}: {
  activeDates: string[];
  weeks: number;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const activeSet = new Set(activeDates);

  /** Build a YYYY-MM-DD string for an offset relative to today (negative = past). */
  const offsetDate = (offset: number): string => {
    const d = new Date(today + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  };

  // Rows: each row = one week, columns = Mon–Sun
  // We align so that the last cell is today's weekday column.
  const todayDow = new Date(today + 'T00:00:00Z').getUTCDay(); // 0=Sun

  // Day labels (Mon–Sun)
  const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  // Build grid: weeks rows × 7 columns (oldest at top-left, today at bottom-right aligned)
  // todayColIndex: Sun=6, Mon=0, ..., Sat=5 in Mon-first grid
  const todayColIndex = todayDow === 0 ? 6 : todayDow - 1;

  // Build exactly weeks*7 cells ending on the last Sunday of the current week,
  // with today somewhere in the last row.  We always show full Mon–Sun rows.
  const cells: (string | null)[] = [];
  const lastSunday = offsetDate(6 - todayColIndex); // last Sunday of current week (may be future)
  for (let i = weeks * 7 - 1; i >= 0; i--) {
    const d = new Date(lastSunday + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - i);
    cells.push(d.toISOString().slice(0, 10));
  }

  const rows: (string | null)[][] = [];
  for (let w = 0; w < weeks; w++) {
    rows.push(cells.slice(w * 7, w * 7 + 7));
  }

  return (
    <View>
      {/* Day-of-week header */}
      <View style={calStyles.row}>
        {DAY_LABELS.map((d) => (
          <Text key={d} style={calStyles.dayLabel}>
            {d}
          </Text>
        ))}
      </View>

      {rows.map((row, wi) => (
        <View key={wi} style={calStyles.row}>
          {row.map((dateStr, di) => {
            if (dateStr === null) {
              return <View key={di} style={calStyles.cell} />;
            }
            const isActive = activeSet.has(dateStr);
            const isToday = dateStr === today;
            const isFuture = dateStr > today;
            return (
              <View
                key={di}
                style={[
                  calStyles.cell,
                  isActive && calStyles.cellActive,
                  isToday && calStyles.cellToday,
                  isFuture && calStyles.cellFuture,
                ]}
              />
            );
          })}
        </View>
      ))}

      {/* Legend */}
      <View style={calStyles.legend}>
        <View style={[calStyles.legendDot, calStyles.cellActive]} />
        <Text style={calStyles.legendText}>Lauf absolviert</Text>
        <View style={[calStyles.legendDot, calStyles.cellToday]} />
        <Text style={calStyles.legendText}>Heute</Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 2,
  },
  subheading: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 16,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 3,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  statUnit: {
    fontSize: 11,
    color: '#9E9E9E',
    marginTop: -2,
  },
  statLabel: {
    fontSize: 11,
    color: '#757575',
    textAlign: 'center',
    marginTop: 4,
  },

  // Generic card
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 12,
  },

  // Progress bar
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212121',
  },
  progressCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E53935',
  },
  progressBarTrack: {
    height: 12,
    backgroundColor: '#FFCDD2',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressDone: {
    fontSize: 13,
    fontWeight: '600',
    color: '#43A047',
    textAlign: 'center',
  },
  progressHint: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
  },

  // Motivation card
  motivationCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  motivationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57F17',
    marginBottom: 8,
  },
  motivationText: {
    fontSize: 13,
    color: '#795548',
    lineHeight: 22,
  },

  // Milestones
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  milestoneEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  milestoneDim: {
    opacity: 0.35,
  },
  milestoneDays: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 1,
  },
  milestoneBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9E9E9E',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  milestoneBadgeReached: {
    color: '#fff',
    backgroundColor: '#43A047',
  },

  // Freeze tokens
  freezeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  freezeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#424242',
    flex: 1,
  },
  freezeTokens: {
    flexDirection: 'row',
    gap: 6,
  },
  freezeToken: {
    fontSize: 22,
    opacity: 0.25,
  },
  freezeTokenActive: {
    opacity: 1,
  },
  freezeHint: {
    fontSize: 12,
    color: '#757575',
    lineHeight: 18,
  },

  bottomPadding: {
    height: 32,
  },
});

const calStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dayLabel: {
    width: 34,
    textAlign: 'center',
    fontSize: 10,
    color: '#9E9E9E',
    fontWeight: '600',
  },
  cell: {
    width: 34,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#F0F0F0',
  },
  cellActive: {
    backgroundColor: '#E53935',
  },
  cellToday: {
    borderWidth: 2,
    borderColor: '#E53935',
    backgroundColor: '#FFCDD2',
  },
  cellFuture: {
    backgroundColor: '#FAFAFA',
    opacity: 0.4,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    color: '#9E9E9E',
    marginRight: 10,
  },
});
