# Medieval Keep

A medieval-themed strategy demo built with Phaser 3 and TypeScript. Uses the **ExamplePack** asset pack for units, buildings, and terrain.

## Getting Started

### Prerequisites

- Node.js 20+ (22 recommended)
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:5173`

### Build

```bash
npm run build
```

Output is in `dist/`.

## Controls

- **Left-click**: Select a unit
- **Drag left-click**: Box select multiple units
- **Right-click**: Move selected units

## Demo Content

- **Terrain**: ExamplePack tiles (flat, raised, stairs, water)
- **Buildings**: Castle, Barracks, Archery, Tower (Blue theme)
- **Units**: Knights (warrior), Footmen (pawn), Archers (archer), Peasants (pawn) with idle/run animations

## Project Structure

```
rts/
├── src/
│   ├── main.ts
│   ├── data/
│   │   └── terrainTileset.ts   # Terrain frame indices (flat/raised/stairs)
│   ├── scenes/
│   │   ├── PreloadScene.ts
│   │   ├── MenuScene.ts
│   │   └── GameScene.ts
│   ├── entities/
│   │   └── Unit.ts             # Knight, Footman, Archer, Peasant
│   └── systems/
│       └── Pathfinding.ts
├── assets/
│   └── sprites/
│       ├── units/examplepack/   # Pawn, Warrior, Archer (idle/run)
│       ├── buildings/examplepack/  # Castle, Barracks, Archery, Tower
│       └── terrain/examplepack/    # Tilemap_color1–3, water
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Unit Types

| Type    | Sprite  | Speed | Health |
|---------|---------|-------|--------|
| Knight  | Warrior | 100   | 120    |
| Footman | Pawn   | 90    | 80     |
| Archer  | Archer | 85    | 50     |
| Peasant | Pawn   | 70    | 40     |

## Tech Stack

- **Phaser 3**: Game framework
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build and dev server
# mini-rts
