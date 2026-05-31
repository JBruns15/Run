import type { Coordinate, HeatmapSegment } from '@run/types';

/**
 * Thresholds that map a run-count to a visual intensity level.
 *
 * Colour scheme (matches the feature spec):
 *   Blue   – selten genutzt       (< 10 runs)
 *   Green  – regelmäßig genutzt   (10 – 49 runs)
 *   Yellow – stark genutzt        (50 – 199 runs)
 *   Red    – sehr stark genutzt   (≥ 200 runs)
 *
 * The alpha byte in each 8-digit hex colour encodes both the hue and the
 * opacity so that a single `strokeColor` prop is sufficient for
 * react-native-maps `Polyline` (which does not expose a separate opacity prop).
 */
const HEATMAP_THRESHOLDS = [
  { min: 200, colour: '#E53935D9' }, // sehr stark – red,   ~85 % opaque
  { min: 50, colour: '#FDD835B3' },  // stark – yellow,     ~70 % opaque
  { min: 10, colour: '#43A0478C' },  // regelmäßig – green, ~55 % opaque
  { min: 0, colour: '#1E88E559' },   // selten – blue,      ~35 % opaque
] as const;

/**
 * Return the display colour for a heatmap segment based on its run count.
 * The colour includes an alpha byte so that opacity is encoded in the single
 * `strokeColor` value expected by react-native-maps `Polyline`.
 *
 * @param runCount - Number of runs on the segment.
 * @returns An 8-digit hex colour string (`#RRGGBBAA`).
 */
export function getHeatmapColour(runCount: number): string {
  for (const { min, colour } of HEATMAP_THRESHOLDS) {
    if (runCount >= min) return colour;
  }
  return HEATMAP_THRESHOLDS[HEATMAP_THRESHOLDS.length - 1].colour;
}

/**
 * Return the stroke width for a heatmap segment scaled to its intensity.
 *
 * @param runCount - Number of runs on the segment.
 * @returns A value between 2 (rarely used) and 6 (very heavily used).
 */
export function getHeatmapStrokeWidth(runCount: number): number {
  if (runCount >= 200) return 6;
  if (runCount >= 50) return 4;
  if (runCount >= 10) return 3;
  return 2;
}

/**
 * Generate plausible-looking sample heatmap segments around a centre point.
 *
 * This function produces deterministic demo data that can be shown before a
 * real backend is integrated.  All segment IDs use the `demo-way-` prefix so
 * they can be distinguished from production data.
 *
 * @param centre - The coordinate around which to generate segments.
 * @returns An array of {@link HeatmapSegment} objects.
 */
export function generateSampleHeatmapData(centre: Coordinate): HeatmapSegment[] {
  const { latitude: lat, longitude: lon } = centre;

  /** Small helper to offset a coordinate by the given deltas. */
  const offset = (dLat: number, dLon: number): Coordinate => ({
    latitude: lat + dLat,
    longitude: lon + dLon,
  });

  return [
    // Very popular main path (red)
    {
      segmentId: 'demo-way-001',
      runCount: 324,
      distanceTotal: 1820.5,
      coordinates: [
        offset(0.002, -0.005),
        offset(0.002, 0),
        offset(0.002, 0.005),
        offset(0.002, 0.01),
      ],
    },
    // Popular side path (red)
    {
      segmentId: 'demo-way-002',
      runCount: 215,
      distanceTotal: 1430.0,
      coordinates: [
        offset(0.002, 0.01),
        offset(0.006, 0.012),
        offset(0.01, 0.008),
      ],
    },
    // Moderately used loop (yellow)
    {
      segmentId: 'demo-way-003',
      runCount: 87,
      distanceTotal: 560.2,
      coordinates: [
        offset(0.002, -0.005),
        offset(-0.002, -0.005),
        offset(-0.005, 0),
        offset(-0.005, 0.005),
      ],
    },
    // Moderately used connector (yellow)
    {
      segmentId: 'demo-way-004',
      runCount: 62,
      distanceTotal: 390.8,
      coordinates: [
        offset(-0.005, 0.005),
        offset(0, 0.008),
        offset(0.002, 0.01),
      ],
    },
    // Occasionally used park path (green)
    {
      segmentId: 'demo-way-005',
      runCount: 28,
      distanceTotal: 210.4,
      coordinates: [
        offset(0.006, -0.004),
        offset(0.009, -0.002),
        offset(0.01, 0.002),
        offset(0.01, 0.008),
      ],
    },
    // Occasionally used trail (green)
    {
      segmentId: 'demo-way-006',
      runCount: 14,
      distanceTotal: 95.0,
      coordinates: [
        offset(-0.002, 0.003),
        offset(-0.004, 0.006),
        offset(-0.005, 0.005),
      ],
    },
    // Rarely used back street (blue)
    {
      segmentId: 'demo-way-007',
      runCount: 5,
      distanceTotal: 32.1,
      coordinates: [
        offset(0.007, -0.007),
        offset(0.007, -0.004),
        offset(0.007, 0),
      ],
    },
    // Rarely used alley (blue)
    {
      segmentId: 'demo-way-008',
      runCount: 2,
      distanceTotal: 8.0,
      coordinates: [
        offset(-0.001, -0.003),
        offset(-0.003, -0.005),
      ],
    },
  ];
}
