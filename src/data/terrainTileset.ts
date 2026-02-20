/**
 * ExamplePack terrain tileset: 9 cols × 6 rows = 54 frames (64×64 each).
 * Frame index = col + row * 9  (e.g. row 2, col 3 → frame 2*9+3 = 21).
 *
 * To match your pack: open Tilemap_color1.png, count from 0 left-to-right top-to-bottom,
 * and set flat / raised / stairs to the frame indices where those tiles appear.
 */
export const TERRAIN_TILESET = {
  cols: 9,
  rows: 6,
  totalFrames: 54,

  /** Flat ground (center tiles); use one or pick randomly for variety */
  flat: [0, 1, 2],
  /** Raised / elevated block (center) */
  raised: [18, 19],
  /** Raised block edge (when raised meets flat) – optional */
  raisedEdge: [20, 21],
  /**
   * Stairs: tile on the LOWER side, going UP toward the raised neighbor.
   * Index by direction of the raised neighbor: N, S, E, W.
   */
  stairs: {
    n: 27, // raised is above (north)
    s: 28, // raised is below (south)
    e: 29, // raised is right (east)
    w: 30, // raised is left (west)
  },
  /** Stairs at corners (two adjacent raised); frame per combination if your pack has them */
  stairsCorner: 31,
} as const;

export type StairsDir = keyof typeof TERRAIN_TILESET.stairs;
