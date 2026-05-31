# Run

Open-source running tracking app built with React Native + Expo and OpenStreetMap.

## Features (planned)

- 📍 Track running routes via GPS
- 🗺️ Route suggestions based on distance and surface preference (OpenStreetMap)
- ⏱️ Pace & finish-time calculator

## Project Structure

```
apps/
 └── mobile/          # Expo React Native app (TypeScript)

packages/
 ├── types/           # Shared TypeScript interfaces (Run, Pace, Route…)
 ├── shared/          # Shared business logic (pace calculation, formatters)
 └── ui/              # Shared React Native UI components

docs/
 └── architecture.md  # Architecture & technology decisions
```

## Architecture Decisions

See [docs/architecture.md](docs/architecture.md) for the full rationale behind:

- **Backend**: Supabase (open-source, PostgreSQL, Auth, Storage)
- **Maps**: react-native-maps + OpenStreetMap tiles (no Google Maps)
- **State management**: React Context + useReducer → Zustand
- **Navigation**: Expo Router
- **Data model**: Run, Coordinate, Pace types in `packages/types`

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9
- [Expo Go](https://expo.dev/go) installed on your device or simulator

### Install dependencies

```bash
npm install
```

### Run the mobile app

```bash
npm run mobile
# or
cd apps/mobile && npm start
```

Scan the QR code with the Expo Go app to open it on your device.

## Development

```bash
# Lint all packages
npm run lint

# Format all files
npm run format

# Type-check all packages
npm run typecheck
```

## License

[MIT](apps/mobile/LICENSE)
