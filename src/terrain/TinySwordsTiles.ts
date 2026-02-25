/**
 * Tiny Swords tileset mapping.
 * Based on visual analysis of Tilemap_color1.png (576×384 = 9×6 grid of 64×64 tiles).
 *
 * TILESET STRUCTURE:
 * ==================
 * The tileset is divided into LEFT (flat ground) and RIGHT (elevated) sections.
 * Column 4 is a spacer.
 *
 * FLAT GROUND (left section, cols 0-3):
 * -------------------------------------
 * Forms island/platform shapes. The 3×3 core in rows 0-2, cols 0-2 provides
 * all the basic corner/edge/center tiles needed.
 *
 *   Frame Index = col + row * 9
 *
 *   Row 0: [0=TL] [1=T]  [2=TR]  [3=?]
 *   Row 1: [9=L]  [10=C] [11=R]  [12=?]
 *   Row 2: [18=BL][19=B] [20=BR] [21=?]
 *   Row 3: [27]   [28]   [29]    [30]   - additional pieces (strips, extensions)
 *   Row 4: [36]   [37]   [38]    [39]   - stairs/ramp pieces
 *   Row 5: [45]   [46]   [47]    [48]   - more variations
 *
 * ELEVATED TERRAIN (right section, cols 5-8):
 * -------------------------------------------
 * Has two parts:
 * 1. TOP SURFACE (rows 0-2): Grass top of elevated platform
 * 2. CLIFF FACES (rows 3-5): Stone cliff sides
 *
 *   Row 0: [5=ETL][6=ET] [7=ETR] [8]
 *   Row 1: [14=EL][15=EC][16=ER] [17]
 *   Row 2: [23=EBL][24=EB][25=EBR][26]
 *   Row 3: [32=CL][33=CC][34=CR] [35]  - cliff faces top
 *   Row 4: [41]   [42]   [43]    [44]  - cliff faces middle
 *   Row 5: [50]   [51]   [52]    [53]  - cliff faces bottom
 */

export const TILESET_COLS = 9;
export const TILESET_ROWS = 6;

/**
 * Flat ground tiles (islands/platforms on water level).
 * These are the basic 3×3 grid forming an island shape.
 */
export const FLAT = {
  // Main 3×3 island shape (rows 0-2, cols 0-2)
  TOP_LEFT: 0,      // frame 0: top-left corner
  TOP: 1,           // frame 1: top edge
  TOP_RIGHT: 2,     // frame 2: top-right corner
  LEFT: 9,          // frame 9: left edge
  CENTER: 10,       // frame 10: center (interior)
  RIGHT: 11,        // frame 11: right edge
  BOTTOM_LEFT: 18,  // frame 18: bottom-left corner
  BOTTOM: 19,       // frame 19: bottom edge
  BOTTOM_RIGHT: 20, // frame 20: bottom-right corner

  // Row 3 (frames 27-30): Horizontal strips / wider pieces
  // Looking at the tileset, row 3 appears to have longer strip tiles
  STRIP_LEFT: 27,   // frame 27: strip left end
  STRIP_H: 28,      // frame 28: horizontal strip middle
  STRIP_RIGHT: 29,  // frame 29: strip right end

  // Convex (inner) corners - for L-shaped or complex islands
  // When you have a corner that goes "inward"
  INNER_TL: 3,      // frame 3: inner top-left (looking at col 3)
  INNER_TR: 12,     // frame 12: inner top-right
  INNER_BL: 21,     // frame 21: inner bottom-left
  INNER_BR: 30,     // frame 30: inner bottom-right

  // Vertical strip pieces (looking at row structure)
  STRIP_TOP: 36,    // frame 36: vertical strip top
  STRIP_V: 37,      // frame 37: vertical strip middle
  STRIP_BOTTOM: 45, // frame 45: vertical strip bottom
} as const;

/**
 * Ramp/stairs tiles.
 * Frames 38-39 (row 4 cols 2-3) and 47-48 (row 5 cols 2-3) are the
 * diagonal stair/ramp transition pieces in the Tiny Swords tileset.
 * Frames 36-37 and 45 are vertical-strip pieces (not ramps).
 */
export const RAMP = {
  STAIR_RIGHT: 38,
  STAIR_LEFT: 39,
  STAIR_RIGHT_ALT: 47,
  STAIR_LEFT_ALT: 48,
} as const;

/**
 * Elevated ground top surface (grass on top of cliff).
 * Uses same structure as flat but placed on elevated areas.
 */
export const ELEVATED_TOP = {
  // Main 3×3 elevated surface (rows 0-2, cols 5-7)
  TOP_LEFT: 5,      // frame 5
  TOP: 6,           // frame 6
  TOP_RIGHT: 7,     // frame 7
  LEFT: 14,         // frame 14
  CENTER: 15,       // frame 15
  RIGHT: 16,        // frame 16
  BOTTOM_LEFT: 23,  // frame 23
  BOTTOM: 24,       // frame 24
  BOTTOM_RIGHT: 25, // frame 25

  // Additional column 8 variants
  ALT_TOP: 8,       // frame 8
  ALT_CENTER: 17,   // frame 17
  ALT_BOTTOM: 26,   // frame 26
} as const;

/**
 * Cliff face tiles (stone sides of elevated terrain).
 * These render BELOW the elevated top to show the cliff drop.
 */
export const CLIFF = {
  // Row 3 (frames 32-35): Top row of cliff faces
  TOP_LEFT: 32,     // frame 32: cliff top-left corner
  TOP: 33,          // frame 33: cliff top edge
  TOP_RIGHT: 34,    // frame 34: cliff top-right corner
  TOP_ALT: 35,      // frame 35: alternate

  // Row 4 (frames 41-44): Middle row of cliff faces
  LEFT: 41,         // frame 41: cliff left side
  CENTER: 42,       // frame 42: cliff center (solid rock)
  RIGHT: 43,        // frame 43: cliff right side
  ALT: 44,          // frame 44: alternate

  // Row 5 (frames 50-53): Bottom row of cliff faces
  BOTTOM_LEFT: 50,  // frame 50: cliff bottom-left
  BOTTOM: 51,       // frame 51: cliff bottom edge
  BOTTOM_RIGHT: 52, // frame 52: cliff bottom-right
  BOTTOM_ALT: 53,   // frame 53: alternate
} as const;

/**
 * Position enum for tile placement in a platform.
 */
export enum TilePosition {
  TOP_LEFT = 'TL',
  TOP = 'T',
  TOP_RIGHT = 'TR',
  LEFT = 'L',
  CENTER = 'C',
  RIGHT = 'R',
  BOTTOM_LEFT = 'BL',
  BOTTOM = 'B',
  BOTTOM_RIGHT = 'BR',
}

/**
 * Returns the appropriate flat ground frame for a given position.
 */
export function getFlatFrame(position: TilePosition): number {
  const frames: Record<TilePosition, number> = {
    [TilePosition.TOP_LEFT]: FLAT.TOP_LEFT,
    [TilePosition.TOP]: FLAT.TOP,
    [TilePosition.TOP_RIGHT]: FLAT.TOP_RIGHT,
    [TilePosition.LEFT]: FLAT.LEFT,
    [TilePosition.CENTER]: FLAT.CENTER,
    [TilePosition.RIGHT]: FLAT.RIGHT,
    [TilePosition.BOTTOM_LEFT]: FLAT.BOTTOM_LEFT,
    [TilePosition.BOTTOM]: FLAT.BOTTOM,
    [TilePosition.BOTTOM_RIGHT]: FLAT.BOTTOM_RIGHT,
  };
  return frames[position];
}

/**
 * Returns the appropriate elevated top surface frame for a given position.
 */
export function getElevatedTopFrame(position: TilePosition): number {
  const frames: Record<TilePosition, number> = {
    [TilePosition.TOP_LEFT]: ELEVATED_TOP.TOP_LEFT,
    [TilePosition.TOP]: ELEVATED_TOP.TOP,
    [TilePosition.TOP_RIGHT]: ELEVATED_TOP.TOP_RIGHT,
    [TilePosition.LEFT]: ELEVATED_TOP.LEFT,
    [TilePosition.CENTER]: ELEVATED_TOP.CENTER,
    [TilePosition.RIGHT]: ELEVATED_TOP.RIGHT,
    [TilePosition.BOTTOM_LEFT]: ELEVATED_TOP.BOTTOM_LEFT,
    [TilePosition.BOTTOM]: ELEVATED_TOP.BOTTOM,
    [TilePosition.BOTTOM_RIGHT]: ELEVATED_TOP.BOTTOM_RIGHT,
  };
  return frames[position];
}

/**
 * Returns the appropriate cliff face frame for a given position.
 * Cliffs only have left/center/right (no top/bottom distinction for edge).
 */
export function getCliffFrame(position: 'LEFT' | 'CENTER' | 'RIGHT'): number {
  switch (position) {
    case 'LEFT': return CLIFF.LEFT;
    case 'CENTER': return CLIFF.CENTER;
    case 'RIGHT': return CLIFF.RIGHT;
  }
}

/**
 * Choose a ramp frame based on which direction has elevated terrain.
 * Uses the diagonal stair pieces from the tileset.
 */
export function getRampFrame(
  highN: boolean,
  highE: boolean,
  highS: boolean,
  highW: boolean,
): number {
  if (highE || highN) return RAMP.STAIR_RIGHT;
  if (highW || highS) return RAMP.STAIR_LEFT;
  return RAMP.STAIR_RIGHT;
}


/**
 * Determines the tile position based on neighbors of the same terrain type.
 * This is used for proper edge/corner selection.
 *
 * @param hasN - Has same terrain to the North
 * @param hasE - Has same terrain to the East
 * @param hasS - Has same terrain to the South
 * @param hasW - Has same terrain to the West
 */
export function determineTilePosition(
  hasN: boolean,
  hasE: boolean,
  hasS: boolean,
  hasW: boolean
): TilePosition {
  // All four neighbors = center
  if (hasN && hasE && hasS && hasW) return TilePosition.CENTER;

  // Three neighbors = edge
  if (hasN && hasE && hasS) return TilePosition.LEFT;   // Open W = left edge
  if (hasE && hasS && hasW) return TilePosition.TOP;    // Open N = top edge
  if (hasS && hasW && hasN) return TilePosition.RIGHT;  // Open E = right edge
  if (hasW && hasN && hasE) return TilePosition.BOTTOM; // Open S = bottom edge

  // Two adjacent neighbors = corner
  if (hasN && hasE) return TilePosition.BOTTOM_LEFT;  // Open S,W = BL corner
  if (hasE && hasS) return TilePosition.TOP_LEFT;     // Open N,W = TL corner
  if (hasS && hasW) return TilePosition.TOP_RIGHT;    // Open N,E = TR corner
  if (hasW && hasN) return TilePosition.BOTTOM_RIGHT; // Open S,E = BR corner

  // Two opposite neighbors = strip (use center as fallback)
  if (hasN && hasS) return TilePosition.CENTER; // Vertical strip
  if (hasE && hasW) return TilePosition.CENTER; // Horizontal strip

  // One neighbor = peninsula/isolated (use appropriate edge)
  if (hasN) return TilePosition.BOTTOM;
  if (hasE) return TilePosition.LEFT;
  if (hasS) return TilePosition.TOP;
  if (hasW) return TilePosition.RIGHT;

  // No neighbors = isolated (use center)
  return TilePosition.CENTER;
}
