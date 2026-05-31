import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';
import { fetchRouteSuggestions } from '@run/shared';
import type { Coordinate, RouteSuggestion, SurfacePreference } from '@run/types';

/** Preset distance options shown as quick-select buttons (in km). */
const PRESET_DISTANCES: number[] = [3, 5, 10, 15, 21.1];

/** Colour palette for the three route polylines. */
const ROUTE_COLOURS = ['#E53935', '#1E88E5', '#43A047'] as const;

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

interface SurfaceOption {
  value: SurfacePreference;
  label: string;
}

const SURFACE_OPTIONS: SurfaceOption[] = [
  { value: 'paved', label: 'Asphalt' },
  { value: 'any', label: 'Gemischt' },
  { value: 'unpaved', label: 'Naturwege / Trails' },
];

/**
 * Full-screen UI for generating and displaying OpenStreetMap-based running
 * route suggestions.
 *
 * The user selects:
 *  - A start point (current GPS position or tapped on the map)
 *  - A desired distance (preset buttons or free-text input)
 *  - A surface preference
 *
 * Up to three round-trip route alternatives are then fetched from OSRM and
 * shown on an OpenStreetMap-backed map together with key stats.
 */
export default function RouteSuggestionScreen() {
  const [startPoint, setStartPoint] = useState<Coordinate | null>(null);
  const [distanceKm, setDistanceKm] = useState<number>(5);
  const [distanceText, setDistanceText] = useState<string>('5');
  const [surface, setSurface] = useState<SurfacePreference>('any');
  const [suggestions, setSuggestions] = useState<RouteSuggestion[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  /** Request GPS location and use it as the start point. */
  async function handleUseCurrentLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Standortzugriff verweigert',
          'Bitte erlaube den Standortzugriff in den Einstellungen.',
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setStartPoint({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setSuggestions([]);
      setSelectedRouteId(null);
    } catch {
      Alert.alert('Fehler', 'Standort konnte nicht ermittelt werden.');
    } finally {
      setLocating(false);
    }
  }

  /** Allow the user to tap the map to select a custom start point. */
  function handleMapPress(event: { nativeEvent: { coordinate: Coordinate } }) {
    setStartPoint(event.nativeEvent.coordinate);
    setSuggestions([]);
    setSelectedRouteId(null);
  }

  /** Update the distance from free-text input. */
  function handleDistanceInput(text: string) {
    setDistanceText(text);
    const parsed = parseFloat(text.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      setDistanceKm(parsed);
    }
  }

  /** Set a preset distance and sync both numeric state and text input. */
  function handlePresetDistance(km: number) {
    setDistanceKm(km);
    setDistanceText(km === 21.1 ? '21,1' : String(km));
  }

  /** Validate inputs, call the routing service, and update suggestion state. */
  async function handleFetchRoutes() {
    if (!startPoint) {
      Alert.alert('Kein Startpunkt', 'Bitte wähle zuerst einen Startpunkt aus.');
      return;
    }
    if (distanceKm <= 0 || isNaN(distanceKm)) {
      Alert.alert('Ungültige Distanz', 'Bitte gib eine gültige Streckenlänge ein.');
      return;
    }

    setLoading(true);
    setSuggestions([]);
    setSelectedRouteId(null);

    try {
      const results = await fetchRouteSuggestions({ origin: startPoint, distanceKm, surface });
      if (results.length === 0) {
        Alert.alert('Keine Routen gefunden', 'Für diesen Startpunkt konnten keine Routen generiert werden. Bitte prüfe deine Internetverbindung oder wähle einen anderen Startpunkt.');
      } else {
        setSuggestions(results);
        setSelectedRouteId(results[0].id);
      }
    } catch {
      Alert.alert('Fehler', 'Routen konnten nicht abgerufen werden. Bitte prüfe deine Internetverbindung.');
    } finally {
      setLoading(false);
    }
  }

  const mapRegion = startPoint
    ? {
        latitude: startPoint.latitude,
        longitude: startPoint.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }
    : undefined;

  return (
    <View style={styles.container}>
      {/* ── Map ─────────────────────────────────────────────────────── */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={mapRegion}
          initialRegion={{
            latitude: 48.1351,
            longitude: 11.582,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          }}
          onPress={handleMapPress}
        >
          {/* OpenStreetMap tiles – no Google Maps */}
          <UrlTile
            urlTemplate={OSM_TILE_URL}
            maximumZ={19}
            flipY={false}
          />

          {startPoint && (
            <Marker coordinate={startPoint} title="Startpunkt" pinColor="#E53935" />
          )}

          {suggestions.map((route, idx) => (
            <Polyline
              key={route.id}
              coordinates={route.waypoints}
              strokeColor={
                route.id === selectedRouteId
                  ? ROUTE_COLOURS[idx % ROUTE_COLOURS.length]
                  : '#BDBDBD'
              }
              strokeWidth={route.id === selectedRouteId ? 4 : 2}
              tappable
              onPress={() => setSelectedRouteId(route.id)}
            />
          ))}
        </MapView>

        {/* OSM copyright notice (required by OSM tile usage policy) */}
        <Text style={styles.osmAttribution}>© OpenStreetMap-Mitwirkende</Text>
      </View>

      {/* ── Controls ────────────────────────────────────────────────── */}
      <ScrollView style={styles.controls} keyboardShouldPersistTaps="handled">
        {/* Start point selection */}
        <Text style={styles.sectionLabel}>Startpunkt</Text>
        <TouchableOpacity
          style={[styles.primaryButton, locating && styles.buttonDisabled]}
          onPress={handleUseCurrentLocation}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>📍 GPS-Position verwenden</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.hintText}>
          {startPoint
            ? `Startpunkt: ${startPoint.latitude.toFixed(5)}, ${startPoint.longitude.toFixed(5)}`
            : 'Oder tippe auf die Karte, um einen Startpunkt zu wählen.'}
        </Text>

        {/* Distance selection */}
        <Text style={styles.sectionLabel}>Distanz (km)</Text>
        <View style={styles.presetRow}>
          {PRESET_DISTANCES.map((km) => (
            <TouchableOpacity
              key={km}
              style={[styles.presetButton, distanceKm === km && styles.presetButtonActive]}
              onPress={() => handlePresetDistance(km)}
            >
              <Text
                style={[
                  styles.presetButtonText,
                  distanceKm === km && styles.presetButtonTextActive,
                ]}
              >
                {km === 21.1 ? '21,1' : km}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.textInput}
          value={distanceText}
          onChangeText={handleDistanceInput}
          keyboardType="decimal-pad"
          placeholder="Freie Eingabe, z. B. 7,5"
          placeholderTextColor="#9E9E9E"
        />

        {/* Surface preference */}
        <Text style={styles.sectionLabel}>Untergrund</Text>
        <View style={styles.surfaceRow}>
          {SURFACE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.surfaceButton, surface === opt.value && styles.surfaceButtonActive]}
              onPress={() => setSurface(opt.value)}
            >
              <Text
                style={[
                  styles.surfaceButtonText,
                  surface === opt.value && styles.surfaceButtonTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fetch routes button */}
        <TouchableOpacity
          style={[styles.primaryButton, styles.fetchButton, loading && styles.buttonDisabled]}
          onPress={handleFetchRoutes}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>🗺️ Routen vorschlagen</Text>
          )}
        </TouchableOpacity>

        {/* Route suggestions list */}
        {suggestions.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Routenvorschläge</Text>
            {suggestions.map((route, idx) => (
              <TouchableOpacity
                key={route.id}
                style={[
                  styles.routeCard,
                  route.id === selectedRouteId && {
                    borderColor: ROUTE_COLOURS[idx % ROUTE_COLOURS.length],
                    borderWidth: 2,
                  },
                ]}
                onPress={() => setSelectedRouteId(route.id)}
              >
                <View
                  style={[
                    styles.routeColourDot,
                    { backgroundColor: ROUTE_COLOURS[idx % ROUTE_COLOURS.length] },
                  ]}
                />
                <View style={styles.routeCardBody}>
                  <Text style={styles.routeLabel}>{route.label}</Text>
                  <Text style={styles.routeStat}>📏 {route.distanceKm.toFixed(1)} km</Text>
                  {route.elevationMetres > 0 && (
                    <Text style={styles.routeStat}>⛰️ {route.elevationMetres} hm</Text>
                  )}
                  <Text style={styles.routeStat}>🛤️ {route.surfaceDescription}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Bottom padding so content isn't hidden behind a home indicator */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  mapContainer: {
    flex: 1,
    minHeight: 260,
  },
  map: {
    flex: 1,
  },
  osmAttribution: {
    position: 'absolute',
    bottom: 4,
    right: 6,
    fontSize: 10,
    color: '#555',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  controls: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#F5F5F5',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginTop: 12,
    marginBottom: 6,
  },
  hintText: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
    marginBottom: 4,
  },
  primaryButton: {
    backgroundColor: '#E53935',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginVertical: 4,
  },
  fetchButton: {
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  presetButton: {
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  presetButtonActive: {
    borderColor: '#E53935',
    backgroundColor: '#FFEBEE',
  },
  presetButtonText: {
    fontSize: 14,
    color: '#424242',
  },
  presetButtonTextActive: {
    color: '#E53935',
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: 15,
    color: '#212121',
    marginBottom: 4,
  },
  surfaceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  surfaceButton: {
    borderWidth: 1,
    borderColor: '#BDBDBD',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  surfaceButtonActive: {
    borderColor: '#1E88E5',
    backgroundColor: '#E3F2FD',
  },
  surfaceButtonText: {
    fontSize: 13,
    color: '#424242',
  },
  surfaceButtonTextActive: {
    color: '#1E88E5',
    fontWeight: '600',
  },
  routeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  routeColourDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
    marginRight: 10,
  },
  routeCardBody: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
  },
  routeStat: {
    fontSize: 13,
    color: '#616161',
    marginBottom: 2,
  },
  bottomPadding: {
    height: 32,
  },
});
