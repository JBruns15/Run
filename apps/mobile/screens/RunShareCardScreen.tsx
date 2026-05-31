import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Polyline, UrlTile } from 'react-native-maps';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { buildShareCardData } from '@run/shared';
import type { Coordinate, Run, RunShareCardData, ShareCardVariant } from '@run/types';

// ---------------------------------------------------------------------------
// Sample run data (used until live GPS tracking is implemented)
// ---------------------------------------------------------------------------

/** GPS waypoints for a sample 5.2 km run around Munich's English Garden. */
const SAMPLE_ROUTE: Coordinate[] = [
  { latitude: 48.1508, longitude: 11.5875 },
  { latitude: 48.1522, longitude: 11.5901 },
  { latitude: 48.154, longitude: 11.5918 },
  { latitude: 48.1563, longitude: 11.5925 },
  { latitude: 48.158, longitude: 11.5908 },
  { latitude: 48.1595, longitude: 11.5879 },
  { latitude: 48.1603, longitude: 11.5848 },
  { latitude: 48.1588, longitude: 11.5824 },
  { latitude: 48.157, longitude: 11.5818 },
  { latitude: 48.155, longitude: 11.583 },
  { latitude: 48.1535, longitude: 11.5854 },
  { latitude: 48.1518, longitude: 11.5868 },
  { latitude: 48.1508, longitude: 11.5875 },
];

/** Demo runs shown in the run list. */
const SAMPLE_RUNS: Run[] = [
  {
    id: '1',
    name: 'Englischer Garten Runde',
    startedAt: new Date(Date.now() - 2 * 24 * 3600_000).toISOString(),
    finishedAt: new Date(Date.now() - 2 * 24 * 3600_000 + 1725_000).toISOString(),
    distanceMetres: 5230,
    durationSeconds: 1725, // ~5:30/km
    route: SAMPLE_ROUTE,
  },
  {
    id: '2',
    name: 'Tempolauf Isar',
    startedAt: new Date(Date.now() - 4 * 24 * 3600_000).toISOString(),
    finishedAt: new Date(Date.now() - 4 * 24 * 3600_000 + 1260_000).toISOString(),
    distanceMetres: 4000,
    durationSeconds: 1260, // ~5:15/km
    route: [
      { latitude: 48.1351, longitude: 11.572 },
      { latitude: 48.137, longitude: 11.5748 },
      { latitude: 48.1393, longitude: 11.5762 },
      { latitude: 48.1415, longitude: 11.5753 },
      { latitude: 48.1435, longitude: 11.573 },
      { latitude: 48.1415, longitude: 11.571 },
      { latitude: 48.139, longitude: 11.5702 },
      { latitude: 48.137, longitude: 11.5708 },
      { latitude: 48.1351, longitude: 11.572 },
    ],
  },
  {
    id: '3',
    name: 'Langer Lauf Nymphenburg',
    startedAt: new Date(Date.now() - 9 * 24 * 3600_000).toISOString(),
    finishedAt: new Date(Date.now() - 9 * 24 * 3600_000 + 3660_000).toISOString(),
    distanceMetres: 10100,
    durationSeconds: 3660, // ~6:04/km
    route: [
      { latitude: 48.158, longitude: 11.503 },
      { latitude: 48.161, longitude: 11.508 },
      { latitude: 48.165, longitude: 11.515 },
      { latitude: 48.168, longitude: 11.52 },
      { latitude: 48.163, longitude: 11.527 },
      { latitude: 48.157, longitude: 11.531 },
      { latitude: 48.151, longitude: 11.526 },
      { latitude: 48.148, longitude: 11.518 },
      { latitude: 48.152, longitude: 11.51 },
      { latitude: 48.158, longitude: 11.503 },
    ],
  },
];

/** Optional demo metadata (heart rate, streak) per run ID. */
const RUN_META: Record<string, { averageHeartRate?: number; streakDays?: number }> = {
  '1': { averageHeartRate: 148, streakDays: 5 },
  '2': { averageHeartRate: 162 },
  '3': { streakDays: 3 },
};

// ---------------------------------------------------------------------------
// Variant styling helpers
// ---------------------------------------------------------------------------

interface VariantStyle {
  background: string;
  accent: string;
  textPrimary: string;
  textSecondary: string;
  statBackground: string;
  footerBackground: string;
  label: string;
  emoji: string;
}

const VARIANT_STYLES: Record<ShareCardVariant, VariantStyle> = {
  clean: {
    background: '#FFFFFF',
    accent: '#E53935',
    textPrimary: '#212121',
    textSecondary: '#757575',
    statBackground: '#FAFAFA',
    footerBackground: '#F5F5F5',
    label: 'Clean',
    emoji: '🟢',
  },
  data: {
    background: '#E3F2FD',
    accent: '#1E88E5',
    textPrimary: '#0D47A1',
    textSecondary: '#1565C0',
    statBackground: '#BBDEFB',
    footerBackground: '#90CAF9',
    label: 'Data',
    emoji: '🔵',
  },
  motivation: {
    background: '#F3E5F5',
    accent: '#8E24AA',
    textPrimary: '#4A148C',
    textSecondary: '#6A1B9A',
    statBackground: '#E1BEE7',
    footerBackground: '#CE93D8',
    label: 'Motivation',
    emoji: '🟣',
  },
  dark: {
    background: '#212121',
    accent: '#FF5252',
    textPrimary: '#FFFFFF',
    textSecondary: '#BDBDBD',
    statBackground: '#333333',
    footerBackground: '#424242',
    label: 'Dark',
    emoji: '⚫',
  },
};

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// ---------------------------------------------------------------------------
// ShareCard component (the exportable card view)
// ---------------------------------------------------------------------------

interface ShareCardProps {
  data: RunShareCardData;
  variant: ShareCardVariant;
}

function ShareCard({ data, variant }: ShareCardProps) {
  const vs = VARIANT_STYLES[variant];

  /** Compute the map region to frame the route, with padding. */
  const mapRegion = React.useMemo(() => {
    const coords = data.run.route;
    if (coords.length === 0) {
      return { latitude: 48.1351, longitude: 11.582, latitudeDelta: 0.05, longitudeDelta: 0.05 };
    }
    const lats = coords.map((c) => c.latitude);
    const lons = coords.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const latDelta = Math.max((maxLat - minLat) * 1.4, 0.005);
    const lonDelta = Math.max((maxLon - minLon) * 1.4, 0.005);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lonDelta,
    };
  }, [data.run.route]);

  const motivationText = (() => {
    if (variant === 'motivation') {
      if (data.distanceKm >= 10) return '🏆 Starke Leistung! 10 km oder mehr!';
      if (data.distanceKm >= 5) return `💪 Starker ${Math.floor(data.distanceKm)} km Lauf!`;
      return '🎉 Gut gemacht – weiter so!';
    }
    return 'Run completed ✅';
  })();

  return (
    <View style={[cardStyles.card, { backgroundColor: vs.background }]}>
      {/* ── Map ──────────────────────────────────────────────────────── */}
      <View style={cardStyles.mapContainer}>
        <MapView
          style={cardStyles.map}
          region={mapRegion}
          scrollEnabled={false}
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}
          toolbarEnabled={false}
          mapType="none"
        >
          <UrlTile urlTemplate={OSM_TILE_URL} maximumZ={19} flipY={false} />
          {data.run.route.length > 1 && (
            <Polyline
              coordinates={data.run.route}
              strokeColor={vs.accent}
              strokeWidth={4}
            />
          )}
        </MapView>
      </View>

      {/* ── Stats row ────────────────────────────────────────────────── */}
      <View style={[cardStyles.statsRow, { backgroundColor: vs.statBackground }]}>
        <View style={cardStyles.statItem}>
          <Text style={[cardStyles.statValue, { color: vs.textPrimary }]}>
            {data.distanceKm.toFixed(2)} km
          </Text>
          <Text style={[cardStyles.statLabel, { color: vs.textSecondary }]}>📏 Distanz</Text>
        </View>
        <View style={[cardStyles.statDivider, { backgroundColor: vs.textSecondary }]} />
        <View style={cardStyles.statItem}>
          <Text style={[cardStyles.statValue, { color: vs.textPrimary }]}>
            {data.formattedDuration}
          </Text>
          <Text style={[cardStyles.statLabel, { color: vs.textSecondary }]}>⏱️ Zeit</Text>
        </View>
        <View style={[cardStyles.statDivider, { backgroundColor: vs.textSecondary }]} />
        <View style={cardStyles.statItem}>
          <Text style={[cardStyles.statValue, { color: vs.textPrimary }]}>
            {data.formattedPace}
          </Text>
          <Text style={[cardStyles.statLabel, { color: vs.textSecondary }]}>⚡ Pace</Text>
        </View>
      </View>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <View style={[cardStyles.footer, { backgroundColor: vs.footerBackground }]}>
        <Text style={[cardStyles.footerTitle, { color: vs.textPrimary }]}>{motivationText}</Text>
        <Text style={[cardStyles.footerDate, { color: vs.textSecondary }]}>
          📅 {data.formattedDate}
        </Text>
        {data.averageHeartRate !== undefined && (
          <Text style={[cardStyles.footerExtra, { color: vs.textSecondary }]}>
            💓 Ø {data.averageHeartRate} bpm
          </Text>
        )}
        {data.streakDays !== undefined && data.streakDays > 0 && (
          <Text style={[cardStyles.footerExtra, { color: vs.accent }]}>
            🔥 {data.streakDays} Tage Streak
          </Text>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

/**
 * Screen that lets the user select a recent run, preview a styled share card,
 * and then export it via the native share sheet or save it to the photo gallery.
 */
export default function RunShareCardScreen() {
  const [selectedRun, setSelectedRun] = useState<Run>(SAMPLE_RUNS[0]);
  const [variant, setVariant] = useState<ShareCardVariant>('clean');
  const [exporting, setExporting] = useState(false);

  const viewShotRef = useRef<ViewShotRef>(null);

  const cardData = React.useMemo(() => {
    const meta = RUN_META[selectedRun.id] ?? {};
    return buildShareCardData(selectedRun, meta.averageHeartRate, meta.streakDays);
  }, [selectedRun]);

  /** Capture the card as a PNG and return its local URI. */
  async function captureCard(): Promise<string | null> {
    try {
      if (!viewShotRef.current?.capture) return null;
      const uri = await viewShotRef.current.capture();
      return uri ?? null;
    } catch {
      return null;
    }
  }

  async function handleShare() {
    setExporting(true);
    try {
      const uri = await captureCard();
      if (!uri) {
        Alert.alert('Fehler', 'Die Karte konnte nicht erstellt werden.');
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Teilen nicht verfügbar', 'Diese Funktion wird auf diesem Gerät nicht unterstützt.');
        return;
      }
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Lauf teilen' });
    } catch {
      Alert.alert('Fehler', 'Beim Teilen ist ein Fehler aufgetreten.');
    } finally {
      setExporting(false);
    }
  }

  async function handleSave() {
    setExporting(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Berechtigung erforderlich',
          'Bitte erlaube den Zugriff auf deine Galerie, um das Bild zu speichern.',
        );
        return;
      }
      const uri = await captureCard();
      if (!uri) {
        Alert.alert('Fehler', 'Die Karte konnte nicht erstellt werden.');
        return;
      }
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Gespeichert ✅', 'Das Bild wurde in deiner Galerie gespeichert.');
    } catch {
      Alert.alert('Fehler', 'Beim Speichern ist ein Fehler aufgetreten.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <Text style={styles.heading}>Lauf teilen</Text>
      <Text style={styles.subheading}>Wähle einen Lauf und teile ihn als Bild</Text>

      {/* ── Run selector ────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Lauf auswählen</Text>
      {SAMPLE_RUNS.map((run) => {
        const d = buildShareCardData(run);
        const isSelected = run.id === selectedRun.id;
        return (
          <TouchableOpacity
            key={run.id}
            style={[styles.runItem, isSelected && styles.runItemSelected]}
            onPress={() => setSelectedRun(run)}
            activeOpacity={0.7}
          >
            <View style={styles.runItemInfo}>
              <Text style={[styles.runItemName, isSelected && styles.runItemNameSelected]}>
                {run.name}
              </Text>
              <Text style={styles.runItemStats}>
                {d.distanceKm.toFixed(2)} km · {d.formattedDuration} · {d.formattedPace}
              </Text>
              <Text style={styles.runItemDate}>{d.formattedDate}</Text>
            </View>
            {isSelected && <Text style={styles.runItemCheck}>✓</Text>}
          </TouchableOpacity>
        );
      })}

      {/* ── Variant selector ────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Design</Text>
      <View style={styles.variantRow}>
        {(Object.keys(VARIANT_STYLES) as ShareCardVariant[]).map((v) => {
          const vs = VARIANT_STYLES[v];
          return (
            <TouchableOpacity
              key={v}
              style={[styles.variantBtn, variant === v && styles.variantBtnActive]}
              onPress={() => setVariant(v)}
              activeOpacity={0.7}
            >
              <Text style={styles.variantBtnText}>
                {vs.emoji} {vs.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Card preview ────────────────────────────────────────────── */}
      <Text style={styles.sectionLabel}>Vorschau</Text>
      <ViewShot
        ref={viewShotRef}
        options={{ format: 'png', quality: 1 }}
        style={styles.cardWrapper}
      >
        <ShareCard data={cardData} variant={variant} />
      </ViewShot>

      {/* ── Action buttons ──────────────────────────────────────────── */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnShare]}
          onPress={handleShare}
          disabled={exporting}
          activeOpacity={0.75}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.actionBtnText}>📤 Teilen</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnSave]}
          onPress={handleSave}
          disabled={exporting}
          activeOpacity={0.75}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.actionBtnText}>💾 Speichern</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Info note ───────────────────────────────────────────────── */}
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          ℹ️ Die Karte wird als Bild exportiert und kann direkt über WhatsApp, Instagram oder
          andere Apps geteilt werden.{' '}
          {Platform.OS === 'android' ? 'Galerie-Berechtigung' : 'Foto-Berechtigung'} wird zum
          Speichern benötigt.
        </Text>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles – ShareCard
// ---------------------------------------------------------------------------

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  mapContainer: {
    height: 200,
  },
  map: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    opacity: 0.3,
  },
  footer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  footerTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  footerDate: {
    fontSize: 12,
    marginBottom: 2,
  },
  footerExtra: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
});

// ---------------------------------------------------------------------------
// Styles – Screen
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9E9E9E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 8,
  },
  // Run list
  runItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  runItemSelected: {
    borderColor: '#E53935',
    borderWidth: 2,
  },
  runItemInfo: {
    flex: 1,
  },
  runItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 2,
  },
  runItemNameSelected: {
    color: '#E53935',
  },
  runItemStats: {
    fontSize: 13,
    color: '#616161',
    marginBottom: 1,
  },
  runItemDate: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  runItemCheck: {
    fontSize: 18,
    color: '#E53935',
    fontWeight: '700',
    marginLeft: 8,
  },
  // Variant switcher
  variantRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  variantBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  variantBtnActive: {
    backgroundColor: '#FFEBEE',
    borderColor: '#E53935',
  },
  variantBtnText: {
    fontSize: 13,
    color: '#424242',
    fontWeight: '500',
  },
  // Card preview wrapper
  cardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  actionBtnShare: {
    backgroundColor: '#E53935',
  },
  actionBtnSave: {
    backgroundColor: '#1E88E5',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
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
