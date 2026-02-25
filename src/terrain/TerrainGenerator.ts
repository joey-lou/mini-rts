/**
 * Procedural terrain generator creating meaningful landscapes.
 * Creates islands, peninsulas, lakes, and elevated regions.
 */

import { TerrainMap } from './TerrainMap';
import { TerrainLevel } from './TerrainTypes';

export interface GeneratorOptions {
  /** Base water coverage (0-1), default 0.15 */
  waterRatio?: number;
  /** Number of elevated regions, default 3-5 */
  elevatedRegions?: number;
  /** Whether to create water bodies (lakes), default true */
  createLakes?: boolean;
  /** Whether to create coastal water edges, default true */
  createCoast?: boolean;
  /** Random seed (optional) */
  seed?: number;
}

const DEFAULT_OPTIONS: Required<GeneratorOptions> = {
  waterRatio: 0.15,
  elevatedRegions: 4,
  createLakes: true,
  createCoast: true,
  seed: 0,
};

/** Simple seeded PRNG for reproducible maps */
class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed || Date.now();
  }

  next(): number {
    this.state = (this.state * 1103515245 + 12345) & 0x7fffffff;
    return this.state / 0x7fffffff;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  bool(probability = 0.5): boolean {
    return this.next() < probability;
  }
}

export function generateTerrain(
  cols: number,
  rows: number,
  options: GeneratorOptions = {}
): TerrainMap {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const rng = new SeededRandom(opts.seed || Math.random() * 100000);
  const map = new TerrainMap(cols, rows);

  // Start with all flat terrain
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      map.set(r, c, TerrainLevel.FLAT, rng.int(0, 3));
    }
  }

  // Create coastal water edges (map borders)
  if (opts.createCoast) {
    createCoastalEdges(map, rng, opts.waterRatio);
  }

  // Create inland lakes
  if (opts.createLakes) {
    createLakes(map, rng, Math.max(1, Math.floor(opts.waterRatio * 10)));
  }

  // Create elevated regions
  createElevatedRegions(map, rng, opts.elevatedRegions);

  // Smooth edges and fix isolated tiles
  smoothTerrain(map);

  return map;
}

function createCoastalEdges(map: TerrainMap, rng: SeededRandom, ratio: number): void {
  const { width, height } = map;
  const edgeDepth = Math.max(2, Math.floor(Math.min(width, height) * ratio * 0.3));

  // Create irregular coastal edges
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      const distFromEdge = Math.min(r, c, height - 1 - r, width - 1 - c);

      if (distFromEdge < edgeDepth) {
        // Probability of water increases toward edges
        const prob = 1 - distFromEdge / edgeDepth;
        // Add noise for irregular coastline
        const noise = rng.next() * 0.4;
        if (rng.next() < prob * 0.8 + noise * 0.2) {
          map.set(r, c, TerrainLevel.WATER);
        }
      }
    }
  }

  // Create bays and inlets
  const numBays = rng.int(2, 4);
  for (let i = 0; i < numBays; i++) {
    const edge = rng.int(0, 3); // 0=top, 1=right, 2=bottom, 3=left
    let startR: number, startC: number;

    switch (edge) {
      case 0: // top
        startR = 0;
        startC = rng.int(width * 0.2, width * 0.8);
        break;
      case 1: // right
        startR = rng.int(height * 0.2, height * 0.8);
        startC = width - 1;
        break;
      case 2: // bottom
        startR = height - 1;
        startC = rng.int(width * 0.2, width * 0.8);
        break;
      default: // left
        startR = rng.int(height * 0.2, height * 0.8);
        startC = 0;
    }

    // Carve bay inland
    const bayLength = rng.int(3, Math.floor(Math.min(width, height) * 0.2));
    const bayWidth = rng.int(2, 4);
    carveWaterPath(map, rng, startR, startC, edge, bayLength, bayWidth);
  }
}

function carveWaterPath(
  map: TerrainMap,
  rng: SeededRandom,
  startR: number,
  startC: number,
  direction: number,
  length: number,
  width: number
): void {
  let r = startR;
  let c = startC;
  const dirVectors = [
    [1, 0],  // top edge -> go down
    [0, -1], // right edge -> go left
    [-1, 0], // bottom edge -> go up
    [0, 1],  // left edge -> go right
  ];
  const [dr, dc] = dirVectors[direction];

  for (let i = 0; i < length; i++) {
    // Carve water in a circular pattern around current position
    for (let wr = -width; wr <= width; wr++) {
      for (let wc = -width; wc <= width; wc++) {
        const dist = Math.sqrt(wr * wr + wc * wc);
        if (dist <= width && rng.next() < 0.8) {
          map.set(r + wr, c + wc, TerrainLevel.WATER);
        }
      }
    }
    r += dr + rng.int(-1, 1);
    c += dc + rng.int(-1, 1);
    r = Math.max(1, Math.min(map.height - 2, r));
    c = Math.max(1, Math.min(map.width - 2, c));
  }
}

function createLakes(map: TerrainMap, rng: SeededRandom, numLakes: number): void {
  const { width, height } = map;

  for (let i = 0; i < numLakes; i++) {
    // Place lakes away from edges
    const centerR = rng.int(height * 0.25, height * 0.75);
    const centerC = rng.int(width * 0.25, width * 0.75);
    const radiusR = rng.int(2, Math.floor(height * 0.1));
    const radiusC = rng.int(2, Math.floor(width * 0.1));

    // Create irregular lake shape
    for (let r = centerR - radiusR - 2; r <= centerR + radiusR + 2; r++) {
      for (let c = centerC - radiusC - 2; c <= centerC + radiusC + 2; c++) {
        const dr = (r - centerR) / radiusR;
        const dc = (c - centerC) / radiusC;
        const dist = Math.sqrt(dr * dr + dc * dc);

        if (dist < 1.0 + rng.next() * 0.3) {
          map.set(r, c, TerrainLevel.WATER);
        }
      }
    }
  }
}

function createElevatedRegions(map: TerrainMap, rng: SeededRandom, numRegions: number): void {
  const { width, height } = map;
  const regions: Array<{ r: number; c: number; w: number; h: number }> = [];

  for (let i = 0; i < numRegions; i++) {
    let attempts = 0;
    while (attempts < 50) {
      const w = rng.int(4, Math.floor(width * 0.15));
      const h = rng.int(4, Math.floor(height * 0.15));
      const startC = rng.int(2, width - w - 2);
      const startR = rng.int(2, height - h - 2);

      // Check overlap with existing regions and water
      let valid = true;
      for (const region of regions) {
        if (
          startC < region.c + region.w + 2 &&
          startC + w + 2 > region.c &&
          startR < region.r + region.h + 2 &&
          startR + h + 2 > region.r
        ) {
          valid = false;
          break;
        }
      }

      // Check if region would be entirely on water
      if (valid) {
        let waterCount = 0;
        for (let r = startR; r < startR + h; r++) {
          for (let c = startC; c < startC + w; c++) {
            if (map.getLevel(r, c) === TerrainLevel.WATER) waterCount++;
          }
        }
        if (waterCount > (w * h) * 0.5) valid = false;
      }

      if (valid) {
        regions.push({ r: startR, c: startC, w, h });

        // Determine elevation level (most are level 1, some are level 2)
        const level = rng.bool(0.3) ? TerrainLevel.ELEVATED_2 : TerrainLevel.ELEVATED_1;

        // Create irregular elevated region
        for (let r = startR; r < startR + h; r++) {
          for (let c = startC; c < startC + w; c++) {
            if (map.getLevel(r, c) === TerrainLevel.WATER) continue;

            // Soften edges with probability falloff
            const edgeDist = Math.min(r - startR, c - startC, startR + h - 1 - r, startC + w - 1 - c);
            const prob = edgeDist === 0 ? 0.6 : 1.0;

            if (rng.next() < prob) {
              map.set(r, c, level, rng.int(0, 3));
            }
          }
        }
        break;
      }
      attempts++;
    }
  }
}

function smoothTerrain(map: TerrainMap): void {
  const { width, height } = map;

  // Remove isolated single-tile terrain features
  for (let pass = 0; pass < 2; pass++) {
    for (let r = 1; r < height - 1; r++) {
      for (let c = 1; c < width - 1; c++) {
        const level = map.getLevel(r, c);
        const neighbors = [
          map.getLevel(r - 1, c),
          map.getLevel(r + 1, c),
          map.getLevel(r, c - 1),
          map.getLevel(r, c + 1),
        ];

        // Count neighbors of same level
        const sameCount = neighbors.filter((n) => n === level).length;

        // If isolated (0-1 same neighbors), adopt majority neighbor level
        if (sameCount <= 1) {
          const counts = new Map<TerrainLevel, number>();
          for (const n of neighbors) {
            counts.set(n, (counts.get(n) || 0) + 1);
          }
          let maxLevel = level;
          let maxCount = 0;
          for (const [l, cnt] of counts) {
            if (cnt > maxCount) {
              maxLevel = l;
              maxCount = cnt;
            }
          }
          if (maxLevel !== level) {
            map.set(r, c, maxLevel, Math.floor(Math.random() * 4));
          }
        }
      }
    }
  }
}
