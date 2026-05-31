import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { calculatePerformancePredictions, formatDuration } from '@run/shared';
import type { Run } from '@run/types';

/**
 * Sample training history used as demo data until Supabase persistence is
 * wired up.  Entries span ~8 weeks so the prediction algorithm has enough
 * data to work with.
 */
const SAMPLE_RUNS: Run[] = [
  {
    id: '1',
    name: 'Morgenlauf',
    startedAt: new Date(Date.now() - 2 * 24 * 3600_000).toISOString(),
    finishedAt: new Date(Date.now() - 2 * 24 * 3600_000 + 1800_000).toISOString(),
    distanceMetres: 5200,
    durationSeconds: 1680, // ~5:24/km
    route: [],
  },
  {
    id: '2',
    name: 'Tempolauf',
    startedAt: new Date(Date.now() - 5 * 24 * 3600_000).toISOString(),
    finishedAt: new Date(Date.now() - 5 * 24 * 3600_000 + 1500_000).toISOString(),
    distanceMetres: 4000,
    durationSeconds: 1260, // ~5:15/km
    route: [],
  },
  {
    id: '3',
    name: 'Langer Lauf',
    startedAt: new Date(Date.now() - 9 * 24 * 3600_000).toISOString(),
    finishedAt: new Date(Date.now() - 9 * 24 * 3600_000 + 3720_000).toISOString(),
    distanceMetres: 10100,
    durationSeconds: 3660, // ~6:04/km
    route: [],
  },
  {
    id: '4',
    name: 'Erholungslauf',
    startedAt: new Date(Date.now() - 14 * 24 * 3600_000).toISOString(),
    finishedAt: new Date(Date.now() - 14 * 24 * 3600_000 + 1980_000).toISOString(),
    distanceMetres: 5000,
    durationSeconds: 1800, // 6:00/km
    route: [],
  },
  {
    id: '5',
    name: 'Intervalltraining',
    startedAt: new Date(Date.now() - 18 * 24 * 3600_000).toISOString(),
    finishedAt: new Date(Date.now() - 18 * 24 * 3600_000 + 1320_000).toISOString(),
    distanceMetres: 4000,
    durationSeconds: 1320, // 5:30/km
    route: [],
  },
  {
    id: '6',
    name: 'Morgenlauf',
    startedAt: new Date(Date.now() - 23 * 24 * 3600_000).toISOString(),
    finishedAt: new Date(Date.now() - 23 * 24 * 3600_000 + 1920_000).toISOString(),
    distanceMetres: 5500,
    durationSeconds: 1920, // ~5:49/km
    route: [],
  },
  {
    id: '7',
    name: 'Wochenendrunde',
    startedAt: new Date(Date.now() - 30 * 24 * 3600_000).toISOString(),
    finishedAt: new Date(Date.now() - 30 * 24 * 3600_000 + 4200_000).toISOString(),
    distanceMetres: 12000,
    durationSeconds: 4320, // 6:00/km
    route: [],
  },
  {
    id: '8',
    name: 'Lauf nach Arbeit',
    startedAt: new Date(Date.now() - 35 * 24 * 3600_000).toISOString(),
    finishedAt: new Date(Date.now() - 35 * 24 * 3600_000 + 1620_000).toISOString(),
    distanceMetres: 4500,
    durationSeconds: 1620, // ~6:00/km
    route: [],
  },
  {
    id: '9',
    name: 'Morgenlauf',
    startedAt: new Date(Date.now() - 42 * 24 * 3600_000).toISOString(),
    finishedAt: new Date(Date.now() - 42 * 24 * 3600_000 + 1860_000).toISOString(),
    distanceMetres: 5000,
    durationSeconds: 1860, // ~6:12/km
    route: [],
  },
  {
    id: '10',
    name: 'Langer Lauf',
    startedAt: new Date(Date.now() - 50 * 24 * 3600_000).toISOString(),
    finishedAt: new Date(Date.now() - 50 * 24 * 3600_000 + 4500_000).toISOString(),
    distanceMetres: 10000,
    durationSeconds: 3900, // 6:30/km
    route: [],
  },
];

/**
 * Screen that displays today's performance forecast based on recent training
 * data.  For each standard distance (1 km, 2 km, 5 km, 10 km) it shows:
 *  - Expected finish time
 *  - Optimistic / conservative confidence range
 * It also surfaces motivational progress messages.
 */
export default function PerformancePredictionScreen() {
  const result = useMemo(() => calculatePerformancePredictions(SAMPLE_RUNS), []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <Text style={styles.heading}>Leistungsprognose</Text>
      <Text style={styles.subheading}>Heute erreichbare Leistung</Text>

      {result.predictions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Noch keine Trainingsdaten vorhanden.{'\n'}
            Absolviere mindestens einen Lauf, um eine Prognose zu erhalten.
          </Text>
        </View>
      ) : (
        <>
          {/* ── Prediction table ──────────────────────────────────────── */}
          <View style={styles.tableCard}>
            {/* Table header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.tableHeaderText]}>Distanz</Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellCenter]}>
                Prognose
              </Text>
              <Text style={[styles.tableCell, styles.tableHeaderText, styles.tableCellRight]}>
                Bereich
              </Text>
            </View>

            {result.predictions.map((pred, index) => (
              <View
                key={pred.distanceKm}
                style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
              >
                <Text style={[styles.tableCell, styles.distanceText]}>
                  {pred.distanceKm} km
                </Text>
                <Text style={[styles.tableCell, styles.expectedText, styles.tableCellCenter]}>
                  {formatDuration(pred.expectedSeconds)}
                </Text>
                <Text style={[styles.tableCell, styles.rangeText, styles.tableCellRight]}>
                  {formatDuration(pred.optimisticSeconds)} – {formatDuration(pred.conservativeSeconds)}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Confidence interval detail for 5 km ───────────────────── */}
          {result.predictions.find((p) => p.distanceKm === 5) && (() => {
            const fiveKm = result.predictions.find((p) => p.distanceKm === 5)!;
            return (
              <View style={styles.confidenceCard}>
                <Text style={styles.confidenceTitle}>Vertrauensbereich 5 km</Text>
                <View style={styles.confidenceRow}>
                  <ConfidenceBadge label="Optimistisch" color="#43A047" time={fiveKm.optimisticSeconds} />
                  <ConfidenceBadge label="Erwartet" color="#1E88E5" time={fiveKm.expectedSeconds} />
                  <ConfidenceBadge label="Konservativ" color="#FB8C00" time={fiveKm.conservativeSeconds} />
                </View>
              </View>
            );
          })()}

          {/* ── Motivation messages ────────────────────────────────────── */}
          {result.motivationMessages.length > 0 && (
            <View style={styles.motivationCard}>
              <Text style={styles.motivationTitle}>💪 Dein Fortschritt</Text>
              {result.motivationMessages.map((msg, i) => (
                <Text key={i} style={styles.motivationText}>
                  • {msg}
                </Text>
              ))}
            </View>
          )}
        </>
      )}

      {/* ── Info note ─────────────────────────────────────────────────── */}
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          ℹ️ Die Prognose basiert auf deinen letzten 8 Wochen Training (max. 20 Läufe). Neuere
          Läufe werden stärker gewichtet. Die Berechnung verwendet die Riegel-Formel für
          Distanz-Umrechnungen.
        </Text>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

/** Small badge showing a labelled time for the confidence interval. */
function ConfidenceBadge({
  label,
  color,
  time,
}: {
  label: string;
  color: string;
  time: number;
}) {
  return (
    <View style={styles.confidenceBadge}>
      <View style={[styles.confidenceDot, { backgroundColor: color }]} />
      <Text style={styles.confidenceBadgeLabel}>{label}</Text>
      <Text style={[styles.confidenceBadgeTime, { color }]}>{formatDuration(time)}</Text>
    </View>
  );
}

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
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  emptyText: {
    fontSize: 14,
    color: '#616161',
    textAlign: 'center',
    lineHeight: 22,
  },
  // Table
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#FAFAFA',
  },
  tableHeader: {
    backgroundColor: '#FFEBEE',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tableHeaderText: {
    fontWeight: '600',
    color: '#B71C1C',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  tableCell: {
    flex: 1,
    fontSize: 15,
    color: '#212121',
  },
  tableCellCenter: {
    textAlign: 'center',
  },
  tableCellRight: {
    textAlign: 'right',
  },
  distanceText: {
    fontWeight: '600',
    color: '#424242',
  },
  expectedText: {
    fontWeight: '700',
    fontSize: 16,
    color: '#E53935',
  },
  rangeText: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  // Confidence card
  confidenceCard: {
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
  confidenceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 12,
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  confidenceBadge: {
    alignItems: 'center',
    flex: 1,
  },
  confidenceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
  },
  confidenceBadgeLabel: {
    fontSize: 11,
    color: '#757575',
    marginBottom: 2,
  },
  confidenceBadgeTime: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Motivation card
  motivationCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  motivationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 8,
  },
  motivationText: {
    fontSize: 13,
    color: '#388E3C',
    lineHeight: 20,
    marginBottom: 4,
  },
  // Info card
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  infoText: {
    fontSize: 12,
    color: '#1565C0',
    lineHeight: 18,
  },
  bottomPadding: {
    height: 32,
  },
});
