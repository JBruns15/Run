# Architecture Decisions

This document captures the key architectural decisions made for the **Run** open-source
running-tracking app. Each decision records the context, the options considered, and the
rationale for the choice made.

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Backend – Supabase](#2-backend--supabase)
3. [Map Library – react-native-maps + OpenStreetMap](#3-map-library--react-native-maps--openstreetmap)
4. [State Management](#4-state-management)
5. [Navigation](#5-navigation)
6. [API Layer](#6-api-layer)
7. [Data Model for Runs](#7-data-model-for-runs)
8. [Offline Support](#8-offline-support)
9. [Route Suggestions – OSRM Routing Engine](#9-route-suggestions--osrm-routing-engine)
10. [Project Structure](#10-project-structure)
11. [Community Heatmap – Beliebte Laufstrecken](#11-community-heatmap--beliebte-laufstrecken)

---

## 1. Technology Stack

| Layer         | Choice                     |
|---------------|----------------------------|
| Mobile        | React Native + Expo (Expo Go) |
| Language      | TypeScript (strict mode)   |
| Linter        | ESLint + `@typescript-eslint` |
| Formatter     | Prettier                   |
| Monorepo      | npm workspaces             |

**Rationale:** Expo allows rapid iteration via Expo Go without native build tooling.
TypeScript provides type safety across all packages. npm workspaces keep the monorepo
simple with no additional tooling required.

---

## 2. Backend – Supabase

**Decision:** Use **Supabase** as the backend.

### Options Considered

| Option    | Pros                                           | Cons                                          |
|-----------|------------------------------------------------|-----------------------------------------------|
| Firebase  | Mature ecosystem, generous free tier           | Proprietary (Google), NoSQL only, vendor lock-in |
| Supabase  | Open-source, PostgreSQL, Auth, Storage, self-hostable | Slightly newer ecosystem               |

### Rationale

- **Open source**: Supabase is fully open source and can be self-hosted, which aligns
  with the project's goal of building exclusively on open-source components.
- **PostgreSQL**: Relational data model is a natural fit for run records, routes, and
  user data. SQL queries and PostGIS extensions can handle geospatial queries.
- **Auth**: Built-in JWT-based authentication with social login providers.
- **Storage**: Object storage for future features (e.g., GPX file exports).
- **Free tier**: Supabase's free tier covers the expected load of a hobby project.

### Configuration Notes

- Environment variables (Supabase URL + anon key) are stored in `.env.local` (gitignored).
- The `@supabase/supabase-js` client will live in `packages/shared`.

---

## 3. Map Library – react-native-maps + OpenStreetMap

**Decision:** Use **react-native-maps** configured with **OpenStreetMap** tile URLs.

### Options Considered

| Option               | Pros                                              | Cons                                           |
|----------------------|---------------------------------------------------|------------------------------------------------|
| react-native-maps    | Mature, well-documented, OSM tile support         | Requires native module linking for Bare workflow |
| MapLibre (maplibre-gl-native) | Fully open-source vector tiles, offline maps | Less Expo managed-workflow support, more setup |
| Google Maps SDK      | Excellent UX                                      | Proprietary, requires API key, billing         |

### Rationale

- **No Google Maps**: Requirement to avoid all Google Maps APIs.
- **react-native-maps** supports custom tile sources, allowing OpenStreetMap tiles
  (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`) to be used as the map provider.
- It integrates well with Expo's managed workflow.
- **MapLibre** remains the preferred upgrade path if vector tiles or offline map
  caching becomes a priority in a later milestone.

### OSM Tile Usage Policy

When using OpenStreetMap tiles in production, the app must comply with the
[OSM Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/):

- Display the OpenStreetMap copyright notice.
- Consider self-hosting tiles or using a commercial tile provider for high-traffic apps.

---

## 4. State Management

**Decision:** Start with **React Context + `useReducer`**; upgrade to **Zustand** if complexity warrants it.

**Rationale:**
- The initial feature set (tracking a single run, pace calculator) does not justify a
  heavy state management library.
- Zustand is the preferred upgrade path: minimal boilerplate, no providers, TypeScript-first.
- Redux is intentionally avoided: too much ceremony for this project's scope.

---

## 5. Navigation

**Decision:** Use **Expo Router** (file-based routing).

**Rationale:**
- Expo Router is the recommended navigation solution for Expo SDK 50+.
- File-based routing reduces boilerplate and is familiar to Next.js developers.
- Deep-linking and URL-based navigation come for free.

---

## 6. API Layer

**Decision:** Use **Supabase JS client** directly in the mobile app (no custom REST backend initially).

**Rationale:**
- Supabase's auto-generated REST API and real-time subscriptions remove the need for a
  custom server at this stage.
- Row-Level Security (RLS) policies in PostgreSQL enforce data ownership without
  application-level middleware.
- A dedicated backend (e.g., Hono or Fastify in a `apps/api` workspace) can be added
  later if business logic complexity increases.

---

## 7. Data Model for Runs

Core entities (defined in `packages/types/src/index.ts`):

```ts
interface Run {
  id: string;
  name: string;
  startedAt: string;      // ISO 8601
  finishedAt: string;     // ISO 8601
  distanceMetres: number;
  durationSeconds: number;
  route: Coordinate[];    // ordered GPS waypoints
}

interface Coordinate {
  latitude: number;
  longitude: number;
}
```

**Database schema (Supabase / PostgreSQL):**

```sql
create table runs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users not null,
  name          text not null,
  started_at    timestamptz not null,
  finished_at   timestamptz not null,
  distance_m    integer not null,
  duration_s    integer not null,
  route         jsonb not null default '[]',
  created_at    timestamptz default now()
);

alter table runs enable row level security;

create policy "Users can only access their own runs"
  on runs for all
  using (auth.uid() = user_id);
```

---

## 8. Offline Support

**Decision:** Not implemented in the initial milestone; planned for a future iteration.

**Plan:**
- Cache the last N runs locally using **expo-sqlite** or **MMKV**.
- Queue new run uploads when offline and sync when connectivity is restored.
- Pre-download OSM tiles for a bounding box using a self-hosted tile server or
  MapLibre's offline tile cache.

---

## 9. Route Suggestions – OSRM Routing Engine

**Decision:** Use the **OSRM** (Open Source Routing Machine) public API as the MVP
routing backend for generating round-trip running route suggestions.

### Options Considered

| Option        | Pros                                                     | Cons                                              |
|---------------|----------------------------------------------------------|---------------------------------------------------|
| OSRM          | Fully open-source, no API key, fast, OSM data            | No surface filtering, no elevation data on public server |
| GraphHopper   | Surface/tag filtering, elevation, flexible profiles      | Requires API key (free tier limited) or self-hosting |
| Valhalla      | Excellent multi-modal support, elevation, costing models | More complex self-hosting                         |
| Google Routes | Excellent UX                                             | Proprietary, requires billing, not OSM-based      |

### Rationale

- **No API key required**: The OSRM public demo server
  (`https://router.project-osrm.org`) requires no registration and is ideal for
  an MVP.
- **100 % open source and OSM-based**: Satisfies the "no Google Maps dependency"
  requirement.
- **Simple integration**: The REST API accepts a semicolon-separated coordinate
  list and returns GeoJSON geometries, which map directly onto
  `react-native-maps` `Polyline` coordinates.
- **Upgrade path**: Switching to GraphHopper or a self-hosted Valhalla instance
  will add surface-aware routing and elevation data in a later milestone.

### Route Generation Strategy

Three candidate routes are generated per request, one for each of three compass
bearings spaced 120° apart (0°, 120°, 240°).  For each bearing a midpoint is
placed at `distanceKm / 2` from the origin.  OSRM then routes:
`origin → midpoint → origin`, forming an approximate round trip.

```
origin ──────► midpoint
  ▲                │
  └────────────────┘
```

This produces three geometrically distinct alternatives while keeping each loop
close to the requested distance.

### Elevation Data

Elevation gain is not available via the OSRM public server.  The
`elevationMetres` field of `RouteSuggestion` is set to `0` until a routing
engine with elevation support (e.g. GraphHopper or Valhalla) is integrated.

### Surface Preference

OSRM's `foot` profile is used for all surface preferences in the MVP.
Surface-aware routing (preferring paved roads vs. trails) will be implemented
when switching to GraphHopper, which exposes `surface` and `tracktype` tag
filtering via custom profiles.

---

## 10. Project Structure

```
run/
├── apps/
│   └── mobile/          # Expo React Native app
│       ├── App.tsx
│       ├── screens/
│       │   └── RouteSuggestionScreen.tsx
│       ├── app.json
│       └── ...
├── packages/
│   ├── types/           # Shared TypeScript interfaces & types
│   ├── shared/          # Shared business logic (pace calc, routing service, heatmap)
│   └── ui/              # Shared React Native UI components
├── docs/
│   └── architecture.md  # This document
├── .eslintrc.json
├── .prettierrc
├── tsconfig.base.json
└── package.json         # Monorepo root (npm workspaces)
```

---

## 11. Community Heatmap – Beliebte Laufstrecken

**Decision:** Implement a toggleable heatmap layer on the route-suggestion map that
visualises how frequently individual road/path segments are used by community runners.

### Feature Overview

| Property          | Detail                                                       |
|-------------------|--------------------------------------------------------------|
| Layer type        | `react-native-maps` `Polyline` overlays                      |
| Colour scale      | Blue → Green → Yellow → Red (low → high usage)               |
| Data granularity  | Per OSM way segment                                          |
| Privacy           | Fully anonymised, aggregated counts only (DSGVO-compliant)   |
| Opt-in            | Users donate data explicitly; opt-out available at any time  |

### Colour Scale

| Colour | Run Count Threshold | Meaning              |
|--------|---------------------|----------------------|
| Blue   | < 10                | Selten genutzt       |
| Green  | 10 – 49             | Regelmäßig genutzt   |
| Yellow | 50 – 199            | Stark genutzt        |
| Red    | ≥ 200               | Sehr stark genutzt   |

### Data Model

Only aggregated, anonymous data is stored per segment.  No personal data, no individual
run records, and no precise start/end addresses are retained in the public dataset.

```ts
interface HeatmapSegment {
  segmentId: string;     // e.g. "osm-way-12345"
  runCount: number;      // total number of runs on this segment
  distanceTotal: number; // sum of all run distances on this segment (km)
  coordinates: Coordinate[]; // segment geometry for map rendering
}
```

Equivalent PostgreSQL / Supabase table:

```sql
create table heatmap_segments (
  segment_id      text primary key,       -- OSM way ID
  run_count       integer not null default 0,
  distance_total  numeric(10, 3) not null default 0,
  coordinates     jsonb not null default '[]'
);

-- No user_id column – data is never linked to individual users.
```

### DSGVO / Privacy Requirements

- Data donation is **opt-in**; a consent dialog is shown before any GPS track is
  contributed to the heatmap.
- Individual runs are aggregated server-side before they are written to
  `heatmap_segments`; raw GPS tracks used for aggregation are deleted immediately.
- No personal identifiers, exact start/end addresses, or per-user run histories are
  stored in the public heatmap dataset.
- Users can withdraw consent and request deletion of their contributed data at any time
  via the account settings screen.
- The heatmap dataset is treated as public (no RLS required) because it contains no
  personal data.

### Integration with Route Suggestions

`RouteSuggestionRequest` includes an optional `preferPopularRoutes` flag.  When set to
`true` the routing service will (in future milestones) bias the OSRM waypoints toward
highly-rated segments so that generated routes overlap with popular community paths.
In the current MVP the flag is accepted by the API but the OSRM routing remains
unchanged; the bias weighting will be implemented when a self-hosted routing engine
with custom costing profiles is available.

### Implementation Phases

| Phase | Scope                                                          |
|-------|----------------------------------------------------------------|
| MVP   | Sample/demo heatmap data; toggle on/off; colour legend         |
| 1     | Real aggregated data from the app's own user base via Supabase |
| 2     | Import of public Open-Data GPX collections; community ranking  |
| 3     | Time-of-day, weekend, and seasonal heatmap filters             |
