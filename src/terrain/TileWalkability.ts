/**
 * Per-terrain-level walkability rules.
 *
 * Instead of per-frame data, we define rules at the TerrainLevel level:
 * each cell has an elevation and open edges. Two adjacent cells allow
 * movement only if their shared edge is open on BOTH sides AND their
 * elevations are compatible (same level, or one is a RAMP bridging them).
 *
 * Elevation compatibility:
 *   FLAT  <-> FLAT        ✓
 *   ELEV  <-> ELEV (same) ✓
 *   FLAT  <-> RAMP        ✓  (ramp bridges flat to elevated)
 *   ELEV  <-> RAMP        ✓
 *   FLAT  <-> ELEV        ✗  (must use ramp)
 *   WATER <-> anything    ✗
 *   CLIFF row             ✗  (cliff cells are the row below elevated south edge — not a terrain level, handled by blocking)
 */

import { TerrainLevel, isElevated } from './TerrainTypes';

/** Effective elevation for pathfinding (0 = ground, 1+ = elevated). */
export function getPathElevation(level: TerrainLevel): number {
  switch (level) {
    case TerrainLevel.WATER:
      return -1;
    case TerrainLevel.FLAT:
      return 0;
    case TerrainLevel.RAMP:
      return 0; // ramp is walkable at both levels
    case TerrainLevel.ELEVATED_1:
      return 1;
    case TerrainLevel.ELEVATED_2:
      return 2;
    default:
      return -1;
  }
}

/**
 * Check if movement between two adjacent terrain cells is allowed.
 * Handles elevation transitions: flat<->flat, elev<->elev, ramp bridges.
 */
export function canTraverse(fromLevel: TerrainLevel, toLevel: TerrainLevel): boolean {
  if (fromLevel === TerrainLevel.WATER || toLevel === TerrainLevel.WATER) return false;

  // Same level — always OK
  if (fromLevel === toLevel) return true;

  // RAMP connects to both FLAT and any ELEVATED
  if (fromLevel === TerrainLevel.RAMP || toLevel === TerrainLevel.RAMP) {
    return true; // WATER already excluded above
  }

  // FLAT <-> ELEVATED without ramp — blocked
  if (fromLevel === TerrainLevel.FLAT && isElevated(toLevel)) return false;
  if (isElevated(fromLevel) && toLevel === TerrainLevel.FLAT) return false;

  // Different elevated levels without ramp — blocked
  if (isElevated(fromLevel) && isElevated(toLevel) && fromLevel !== toLevel) return false;

  return true;
}
