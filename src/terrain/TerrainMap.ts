/**
 * Procedural terrain map generator.
 * Creates meaningful landscapes with water, flat ground, and elevated regions.
 */

import { TerrainLevel, TILE_SIZE } from './TerrainTypes';

export type SavedUnitType = 'knight' | 'footman' | 'archer' | 'peasant' | 'lancer';
export type SavedTeam = 'player' | 'enemy';
export type SavedBuildingType = 'castle' | 'barracks' | 'archery' | 'tower' | 'monastery';

/** Saved map format: width, height, cells, and optional entities. */
export interface SavedMapData {
  width: number;
  height: number;
  cells: number[][];
  entities?: {
    units: Array<{ col: number; row: number; type: SavedUnitType; team: SavedTeam }>;
    buildings: Array<{ col: number; row: number; type: SavedBuildingType }>;
  };
}

export interface TerrainCell {
  level: TerrainLevel;
  variation: number; // 0-3 for tile variation
}

export class TerrainMap {
  readonly width: number;
  readonly height: number;
  private cells: TerrainCell[][];

  constructor(cols: number, rows: number) {
    this.width = cols;
    this.height = rows;
    this.cells = [];
    for (let r = 0; r < rows; r++) {
      this.cells[r] = [];
      for (let c = 0; c < cols; c++) {
        this.cells[r][c] = { level: TerrainLevel.FLAT, variation: 0 };
      }
    }
  }

  /** Create a TerrainMap from saved map data (terrain only; entities are in data.entities). */
  static fromData(data: SavedMapData): TerrainMap {
    const map = new TerrainMap(data.width, data.height);
    for (let r = 0; r < data.height; r++) {
      const row = data.cells[r];
      if (!Array.isArray(row)) continue;
      for (let c = 0; c < data.width && c < row.length; c++) {
        const level = row[c];
        const validLevel =
          level === TerrainLevel.WATER ||
          level === TerrainLevel.FLAT ||
          level === TerrainLevel.ELEVATED_1 ||
          level === TerrainLevel.ELEVATED_2 ||
          level === TerrainLevel.RAMP;
        map.set(r, c, validLevel ? (level as TerrainLevel) : TerrainLevel.FLAT, 0);
      }
    }
    return map;
  }

  /** Serialize this map to SavedMapData. Pass entities to include them (defaults to empty arrays). */
  toData(entities?: SavedMapData['entities']): SavedMapData {
    const cells: number[][] = [];
    for (let r = 0; r < this.height; r++) {
      cells[r] = [];
      for (let c = 0; c < this.width; c++) {
        cells[r][c] = this.getLevel(r, c);
      }
    }
    return {
      width: this.width,
      height: this.height,
      cells,
      entities: entities ?? { units: [], buildings: [] },
    };
  }

  get(row: number, col: number): TerrainCell | null {
    if (row < 0 || row >= this.height || col < 0 || col >= this.width) {
      return null;
    }
    return this.cells[row][col];
  }

  set(row: number, col: number, level: TerrainLevel, variation = 0): void {
    if (row >= 0 && row < this.height && col >= 0 && col < this.width) {
      this.cells[row][col] = { level, variation };
    }
  }

  getLevel(row: number, col: number): TerrainLevel {
    return this.get(row, col)?.level ?? TerrainLevel.WATER;
  }

  /**
   * Computes 4-bit neighbor mask for a given level.
   * Bit is set if the neighbor at that direction has the SAME level.
   */
  getNeighborMask(row: number, col: number, level: TerrainLevel): number {
    const match = (r: number, c: number): boolean => {
      const cell = this.get(r, c);
      return cell !== null && cell.level === level;
    };
    let mask = 0;
    if (match(row - 1, col)) mask |= 1; // N
    if (match(row, col + 1)) mask |= 2; // E
    if (match(row + 1, col)) mask |= 4; // S
    if (match(row, col - 1)) mask |= 8; // W
    return mask;
  }

  /**
   * Checks if a neighbor at the given direction has a HIGHER terrain level.
   * Used for determining cliff/shadow placement.
   */
  hasHigherNeighbor(row: number, col: number, dir: 'N' | 'E' | 'S' | 'W'): boolean {
    const currentLevel = this.getLevel(row, col);
    const offsets = { N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1] };
    const [dr, dc] = offsets[dir];
    const neighborLevel = this.getLevel(row + dr, col + dc);
    return neighborLevel > currentLevel;
  }

  /**
   * Checks if a tile touches water (has water neighbor).
   */
  touchesWater(row: number, col: number): boolean {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of dirs) {
      if (this.getLevel(row + dr, col + dc) === TerrainLevel.WATER) {
        return true;
      }
    }
    return false;
  }

  /**
   * Gets tiles that should have water foam (flat ground touching water).
   */
  getFoamTiles(): Array<{ row: number; col: number; mask: number }> {
    const result: Array<{ row: number; col: number; mask: number }> = [];
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        const level = this.getLevel(r, c);
        if (level >= TerrainLevel.FLAT && this.touchesWater(r, c)) {
          // Compute which directions have water
          let mask = 0;
          if (this.getLevel(r - 1, c) === TerrainLevel.WATER) mask |= 1; // N
          if (this.getLevel(r, c + 1) === TerrainLevel.WATER) mask |= 2; // E
          if (this.getLevel(r + 1, c) === TerrainLevel.WATER) mask |= 4; // S
          if (this.getLevel(r, c - 1) === TerrainLevel.WATER) mask |= 8; // W
          if (mask > 0) {
            result.push({ row: r, col: c, mask });
          }
        }
      }
    }
    return result;
  }

  toPixelX(col: number): number {
    return col * TILE_SIZE;
  }

  toPixelY(row: number): number {
    return row * TILE_SIZE;
  }

  /** Debug: print ASCII map */
  debugPrint(): void {
    const chars = { [-1]: '~', 0: '.', 1: '#', 2: '^', 3: '/' };
    for (let r = 0; r < this.height; r++) {
      let line = '';
      for (let c = 0; c < this.width; c++) {
        const level = this.getLevel(r, c);
        line += chars[level] ?? '?';
      }
      console.log(line);
    }
  }
}
