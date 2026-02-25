/**
 * Terrain system based on Tiny Swords tilemap guide.
 * @see https://pixelfrog-assets.itch.io/tiny-swords/devlog/1138989/tilemap-guide
 *
 * Layer order (bottom to top):
 * 1. BG Color (water fill)
 * 2. Water Foam (animated waves at water edges)
 * 3. Flat Ground (lowest walkable terrain)
 * 4. Shadow + Elevated Ground (repeated for each elevation level)
 *
 * Grid: 64×64 tile size. Shadows/foam use 128×128 sprites overlapping.
 */

export const TILE_SIZE = 64;

/** Pixels to shift tile upward per elevation level (screen Y decreases = higher). */
export const HEIGHT_PER_LEVEL = 24;

/**
 * Terrain height levels. RAMP has a high numeric value (3) but is NOT
 * actually elevated — it is a flat-level transition tile between flat
 * and elevated terrain. Always use the helper predicates below instead
 * of bare numeric comparisons when checking elevation.
 */
export enum TerrainLevel {
  WATER = -1,
  FLAT = 0,
  ELEVATED_1 = 1,
  ELEVATED_2 = 2,
  RAMP = 3,
}

/** True for ELEVATED_1 or ELEVATED_2 (not RAMP, not FLAT, not WATER). */
export function isElevated(level: TerrainLevel): boolean {
  return level === TerrainLevel.ELEVATED_1 || level === TerrainLevel.ELEVATED_2;
}

/** True for any walkable ground (FLAT, ELEVATED_*, or RAMP). */
export function isGround(level: TerrainLevel): boolean {
  return level !== TerrainLevel.WATER;
}

/** Y-offset for rendering: 0 = flat, negative = drawn higher on screen. */
export function getTerrainYOffset(level: TerrainLevel): number {
  switch (level) {
    case TerrainLevel.WATER:
    case TerrainLevel.FLAT:
    case TerrainLevel.RAMP:
      return 0;
    case TerrainLevel.ELEVATED_1:
      return -HEIGHT_PER_LEVEL;
    case TerrainLevel.ELEVATED_2:
      return -2 * HEIGHT_PER_LEVEL;
    default:
      return 0;
  }
}

/** 4-bit neighbor bitmask: N=1, E=2, S=4, W=8 */
export type NeighborMask = number;
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

/** Tileset frame indices for the 9×6 grid (576×384 px, 64×64 tiles) */
export const TILESET = {
  cols: 9,
  rows: 6,
  totalFrames: 54,
  frameWidth: 64,
  frameHeight: 64,
} as const;
