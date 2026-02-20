import Phaser from 'phaser';

interface GridNode {
  x: number;
  y: number;
  walkable: boolean;
  g: number; // Cost from start
  h: number; // Heuristic cost to end
  f: number; // Total cost (g + h)
  parent: GridNode | null;
}

/**
 * A* Pathfinding system for grid-based movement.
 * This is a foundation for RTS unit navigation.
 */
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
          g: 0,
          h: 0,
          f: 0,
          parent: null
        };
      }
    }
  }

  /**
   * Set whether a cell is walkable (for obstacles, buildings, etc.)
   */
  setWalkable(gridX: number, gridY: number, walkable: boolean): void {
    if (this.isValidCell(gridX, gridY)) {
      this.grid[gridY][gridX].walkable = walkable;
    }
  }

  /**
   * Convert world coordinates to grid coordinates
   */
  worldToGrid(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.floor(worldX / this._cellSize),
      y: Math.floor(worldY / this._cellSize)
    };
  }

  /**
   * Convert grid coordinates to world coordinates (center of cell)
   */
  gridToWorld(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: gridX * this._cellSize + this._cellSize / 2,
      y: gridY * this._cellSize + this._cellSize / 2
    };
  }

  /**
   * Find a path from start to end using A* algorithm
   */
  findPath(
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ): Phaser.Math.Vector2[] {
    const start = this.worldToGrid(startX, startY);
    const end = this.worldToGrid(endX, endY);

    // Validate positions
    if (!this.isValidCell(start.x, start.y) || !this.isValidCell(end.x, end.y)) {
      return [];
    }

    if (!this.grid[end.y][end.x].walkable) {
      return [];
    }

    // Reset grid
    this.resetGrid();

    const openList: GridNode[] = [];
    const closedList: Set<string> = new Set();

    const startNode = this.grid[start.y][start.x];
    openList.push(startNode);

    while (openList.length > 0) {
      // Find node with lowest f cost
      let currentIndex = 0;
      for (let i = 1; i < openList.length; i++) {
        if (openList[i].f < openList[currentIndex].f) {
          currentIndex = i;
        }
      }

      const current = openList[currentIndex];

      // Reached the goal
      if (current.x === end.x && current.y === end.y) {
        return this.reconstructPath(current);
      }

      // Move current from open to closed
      openList.splice(currentIndex, 1);
      closedList.add(`${current.x},${current.y}`);

      // Check neighbors
      const neighbors = this.getNeighbors(current);
      for (const neighbor of neighbors) {
        if (closedList.has(`${neighbor.x},${neighbor.y}`)) {
          continue;
        }

        if (!neighbor.walkable) {
          continue;
        }

        const tentativeG = current.g + this.getDistance(current, neighbor);

        const inOpenList = openList.includes(neighbor);
        if (!inOpenList || tentativeG < neighbor.g) {
          neighbor.parent = current;
          neighbor.g = tentativeG;
          neighbor.h = this.getDistance(neighbor, this.grid[end.y][end.x]);
          neighbor.f = neighbor.g + neighbor.h;

          if (!inOpenList) {
            openList.push(neighbor);
          }
        }
      }
    }

    // No path found
    return [];
  }

  private isValidCell(x: number, y: number): boolean {
    return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight;
  }

  private resetGrid(): void {
    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        this.grid[y][x].g = 0;
        this.grid[y][x].h = 0;
        this.grid[y][x].f = 0;
        this.grid[y][x].parent = null;
      }
    }
  }

  private getNeighbors(node: GridNode): GridNode[] {
    const neighbors: GridNode[] = [];
    const directions = [
      { x: 0, y: -1 },  // Up
      { x: 1, y: 0 },   // Right
      { x: 0, y: 1 },   // Down
      { x: -1, y: 0 },  // Left
      { x: 1, y: -1 },  // Up-Right
      { x: 1, y: 1 },   // Down-Right
      { x: -1, y: 1 },  // Down-Left
      { x: -1, y: -1 }  // Up-Left
    ];

    for (const dir of directions) {
      const newX = node.x + dir.x;
      const newY = node.y + dir.y;

      if (this.isValidCell(newX, newY)) {
        neighbors.push(this.grid[newY][newX]);
      }
    }

    return neighbors;
  }

  private getDistance(a: GridNode, b: GridNode): number {
    // Diagonal distance heuristic
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

  /** Mark all grid cells overlapping a building's world-space footprint as non-walkable. */
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

  /**
   * Find a path and apply simple smoothing:
   * Remove intermediate waypoints that are collinear with their neighbours.
   */
  findPathSmooth(startX: number, startY: number, endX: number, endY: number): Phaser.Math.Vector2[] {
    const raw = this.findPath(startX, startY, endX, endY);
    if (raw.length <= 2) return raw;

    const smoothed: Phaser.Math.Vector2[] = [raw[0]];
    for (let i = 1; i < raw.length - 1; i++) {
      const prev = smoothed[smoothed.length - 1];
      const curr = raw[i];
      const next = raw[i + 1];

      // Direction vectors
      const d1x = curr.x - prev.x;
      const d1y = curr.y - prev.y;
      const d2x = next.x - curr.x;
      const d2y = next.y - curr.y;

      // Cross product; if near zero the three points are collinear
      const cross = d1x * d2y - d1y * d2x;
      if (Math.abs(cross) > 0.001) {
        smoothed.push(curr);
      }
    }
    smoothed.push(raw[raw.length - 1]);
    return smoothed;
  }

  get cellSizeValue(): number {
    return this._cellSize;
  }
}
