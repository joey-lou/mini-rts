import Phaser from 'phaser';
import { TerrainLevel } from '../terrain/TerrainTypes';
import { canTraverse } from '../terrain/TileWalkability';

interface GridNode {
  x: number;
  y: number;
  walkable: boolean;
  terrainLevel: TerrainLevel;
  g: number;
  h: number;
  f: number;
  parent: GridNode | null;
}

export class Pathfinding {
  private grid: GridNode[][] = [];
  private gridWidth: number;
  private gridHeight: number;
  private _cellSize: number;

  constructor(width: number, height: number, cellSize: number = 32) {
    this.gridWidth = Math.ceil(width / cellSize);
    this.gridHeight = Math.ceil(height / cellSize);
    this._cellSize = cellSize;
    this.initializeGrid();
  }

  private initializeGrid(): void {
    this.grid = [];
    for (let y = 0; y < this.gridHeight; y++) {
      this.grid[y] = [];
      for (let x = 0; x < this.gridWidth; x++) {
        this.grid[y][x] = {
          x,
          y,
          walkable: true,
          terrainLevel: TerrainLevel.FLAT,
          g: 0,
          h: 0,
          f: 0,
          parent: null,
        };
      }
    }
  }

  setWalkable(gridX: number, gridY: number, walkable: boolean): void {
    if (this.isValidCell(gridX, gridY)) {
      this.grid[gridY][gridX].walkable = walkable;
    }
  }

  /** Set terrain level for a cell (used by GameScene to feed terrain data). */
  setTerrainLevel(gridX: number, gridY: number, level: TerrainLevel): void {
    if (this.isValidCell(gridX, gridY)) {
      const node = this.grid[gridY][gridX];
      node.terrainLevel = level;
      node.walkable = level !== TerrainLevel.WATER;
    }
  }

  worldToGrid(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.floor(worldX / this._cellSize),
      y: Math.floor(worldY / this._cellSize),
    };
  }

  gridToWorld(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: gridX * this._cellSize + this._cellSize / 2,
      y: gridY * this._cellSize + this._cellSize / 2,
    };
  }

  findPath(startX: number, startY: number, endX: number, endY: number): Phaser.Math.Vector2[] {
    const start = this.worldToGrid(startX, startY);
    const end = this.worldToGrid(endX, endY);

    if (!this.isValidCell(start.x, start.y) || !this.isValidCell(end.x, end.y)) return [];
    if (!this.grid[end.y][end.x].walkable) return [];

    this.resetGrid();

    const openList: GridNode[] = [];
    const closedList: Set<string> = new Set();

    const startNode = this.grid[start.y][start.x];
    openList.push(startNode);

    while (openList.length > 0) {
      let currentIndex = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[currentIndex].f) currentIndex = i;
      }

      const current = openList[currentIndex];

      if (current.x === end.x && current.y === end.y) {
        return this.reconstructPath(current);
      }

      openList.splice(currentIndex, 1);
      closedList.add(`${current.x},${current.y}`);

      const neighbors = this.getNeighbors(current);
      for (const neighbor of neighbors) {
        if (closedList.has(`${neighbor.x},${neighbor.y}`)) continue;
        if (!neighbor.walkable) continue;

        // Elevation-aware traversal check
        if (!canTraverse(current.terrainLevel, neighbor.terrainLevel)) continue;

        // For diagonal moves, also check that both cardinal cells are traversable
        const dx = neighbor.x - current.x;
        const dy = neighbor.y - current.y;
        if (dx !== 0 && dy !== 0) {
          const cx = this.grid[current.y][neighbor.x];
          const cy = this.grid[neighbor.y][current.x];
          if (!cx.walkable || !cy.walkable) continue;
          if (!canTraverse(current.terrainLevel, cx.terrainLevel)) continue;
          if (!canTraverse(current.terrainLevel, cy.terrainLevel)) continue;
        }

        const tentativeG = current.g + this.getDistance(current, neighbor);

        const inOpenList = openList.includes(neighbor);
        if (!inOpenList || tentativeG < neighbor.g) {
          neighbor.parent = current;
          neighbor.g = tentativeG;
          neighbor.h = this.getDistance(neighbor, this.grid[end.y][end.x]);
          neighbor.f = neighbor.g + neighbor.h;
          if (!inOpenList) openList.push(neighbor);
        }
      }
    }

    return [];
  }

  private isValidCell(x: number, y: number): boolean {
    return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight;
  }

  private resetGrid(): void {
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const node = this.grid[y][x];
        node.g = 0;
        node.h = 0;
        node.f = 0;
        node.parent = null;
      }
    }
  }

  private getNeighbors(node: GridNode): GridNode[] {
    const neighbors: GridNode[] = [];
    const directions = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: -1 },
      { x: 1, y: 1 },
      { x: -1, y: 1 },
      { x: -1, y: -1 },
    ];
    for (const dir of directions) {
      const nx = node.x + dir.x;
      const ny = node.y + dir.y;
      if (this.isValidCell(nx, ny)) neighbors.push(this.grid[ny][nx]);
    }
    return neighbors;
  }

  private getDistance(a: GridNode, b: GridNode): number {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
  }

  private reconstructPath(endNode: GridNode): Phaser.Math.Vector2[] {
    const path: Phaser.Math.Vector2[] = [];
    let current: GridNode | null = endNode;
    while (current !== null) {
      const worldPos = this.gridToWorld(current.x, current.y);
      path.unshift(new Phaser.Math.Vector2(worldPos.x, worldPos.y));
      current = current.parent;
    }
    return path;
  }

  markBuildingBlocked(worldX: number, worldY: number, widthPx: number, heightPx: number): void {
    const halfW = widthPx / 2;
    const halfH = heightPx / 2;
    const startGrid = this.worldToGrid(worldX - halfW, worldY - halfH);
    const endGrid = this.worldToGrid(worldX + halfW, worldY + halfH);
    for (let gy = startGrid.y; gy <= endGrid.y; gy++) {
      for (let gx = startGrid.x; gx <= endGrid.x; gx++) {
        this.setWalkable(gx, gy, false);
      }
    }
  }

  findPathSmooth(startX: number, startY: number, endX: number, endY: number): Phaser.Math.Vector2[] {
    const raw = this.findPath(startX, startY, endX, endY);
    if (raw.length <= 2) return raw;

    const smoothed: Phaser.Math.Vector2[] = [raw[0]];
    for (let i = 1; i < raw.length - 1; i++) {
      const prev = smoothed[smoothed.length - 1];
      const curr = raw[i];
      const next = raw[i + 1];
      const d1x = curr.x - prev.x;
      const d1y = curr.y - prev.y;
      const d2x = next.x - curr.x;
      const d2y = next.y - curr.y;
      const cross = d1x * d2y - d1y * d2x;
      if (Math.abs(cross) > 0.001) smoothed.push(curr);
    }
    smoothed.push(raw[raw.length - 1]);
    return smoothed;
  }

  get cellSizeValue(): number {
    return this._cellSize;
  }
}
